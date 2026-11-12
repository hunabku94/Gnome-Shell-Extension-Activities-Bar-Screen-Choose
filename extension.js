// extension.js
// Runs inside : GNOME Shell (entry point of the extension, loaded directly by the shell)

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

// #region Settings keys
// A GSettings key that records the selected monitor connector (an empty string
// indicates the primary monitor).
const SETTING_MONITOR_CONNECTOR = 'monitor-connector';
// #endregion Settings keys

export default class ActivitiesBarScreenChooseExtension extends Extension
{
    // #region Fields
    // When the extension is activated, a GSettings instance is created and it is
    // destroyed when the extension is deactivated.
    _settings = null;

    // Handler ID for the GSettings 'changed::monitor-connector' notification
    _settingsChangedId = 0;

    // The handler ID for the 'monitors-changed' event in the layout manager
    _monitorsChangedId = 0;

    // The handler ID for 'startup-complete' within the layout manager
    _startupCompleteId = 0;
    // #endregion Fields

    // #region Lifecycle
    // Triggered by the shell each time the extension is enabled
    enable()
    {
        this._settings = this.getSettings();

        // Adjust the bar again if a different monitor is chosen in the preferences
        // window.
        this._settingsChangedId = this._settings.connect(
            `changed::${SETTING_MONITOR_CONNECTOR}`,
            () => this._applyPanelMonitor());

        // This only triggers after the layout manager has returned the panel to the
        // primary monitor, allowing our handler to override that placement.
        this._monitorsChangedId = Main.layoutManager.connect(
            'monitors-changed',
            () => this._applyPanelMonitor());

        // When we are activated upon logging in, the shell has not fully started
        // yet.
        if (Main.layoutManager._startingUp)
        {
            this._startupCompleteId = Main.layoutManager.connect(
                'startup-complete',
                () => this._applyPanelMonitor());
        }

        this._applyPanelMonitor();
    }

    // Triggered by the shell upon disabling the extension. Ensure it remains
    // synchronous; GNOME Shell 51 will throw an error with an async disable().
    disable()
    {
        if (this._settingsChangedId)
        {
            this._settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = 0;
        }

        if (this._monitorsChangedId)
        {
            Main.layoutManager.disconnect(this._monitorsChangedId);
            this._monitorsChangedId = 0;
        }

        if (this._startupCompleteId)
        {
            Main.layoutManager.disconnect(this._startupCompleteId);
            this._startupCompleteId = 0;
        }

        // Return the panel to its original position on the main display.
        this._movePanelToMonitor(Main.layoutManager.primaryMonitor);

        this._settings = null;
    }
    // #endregion Lifecycle

    // #region Panel placement
    // Identifies the monitor the settings refer to and then positions the panel on
    // it
    _applyPanelMonitor()
    {
        const target = this._resolveTargetMonitor();
        this._movePanelToMonitor(target);
    }

    // Returns the Main.layoutManager.monitors entry for the saved connector;
    // defaults to the primary monitor if no entry is saved or if it's disconnected.
    _resolveTargetMonitor()
    {
        const primary = Main.layoutManager.primaryMonitor;
        const connector = this._settings.get_string(SETTING_MONITOR_CONNECTOR);

        // No stored data: keep the default behavior
        if (connector === '')
        {
            return primary;
        }

        const index = this._getMonitorIndexForConnector(connector);

        // If the connector is not attached or the lookup fails, the system will
        // revert to using the primary monitor.
        if (index < 0 || index >= Main.layoutManager.monitors.length)
        {
            return primary;
        }

        return Main.layoutManager.monitors[index];
    }

    // Mutter is tasked with identifying the monitor index linked to the given
    // connector; if the connector is unrecognized or the search fails, it outputs
    // -1.
    _getMonitorIndexForConnector(connector)
    {
        try
        {
            const monitorManager = global.backend.get_monitor_manager();
            return monitorManager.get_monitor_for_connector(connector);
        }
        catch (e)
        {
            console.warn(`[${this.uuid}] Could not find a monitor for connector "${connector}": ${e.message}`);
            return -1;
        }
    }

    // Adjusts the position and dimensions of panelBox (the parent of Main.panel) to
    // match the monitor. Given that the layout manager considers panelBox as part
    // of the chrome, work-area struts and fullscreen functionality handle
    // themselves accordingly.
    _movePanelToMonitor(monitor)
    {
        const panelBox = Main.layoutManager.panelBox;

        if (!monitor || !panelBox)
        {
            return;
        }

        panelBox.set_position(monitor.x, monitor.y);
        panelBox.set_size(monitor.width, -1);
    }
    // #endregion Panel placement
}
