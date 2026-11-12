// extension.js
// Attaches to : GNOME Shell (extension entry point, loaded by GNOME Shell itself)

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

// #region Settings keys
// GSettings key holding the connector name of the chosen monitor ('' = primary)
const SETTING_MONITOR_CONNECTOR = 'monitor-connector';
// #endregion Settings keys

export default class ActivitiesBarScreenChooseExtension extends Extension
{
    // #region Fields
    // GSettings instance of the extension (created in enable, released in disable)
    _settings = null;

    // Signal id of the 'changed::monitor-connector' GSettings signal
    _settingsChangedId = 0;

    // Signal id of the layout manager 'monitors-changed' signal
    _monitorsChangedId = 0;

    // Signal id of the layout manager 'startup-complete' signal
    _startupCompleteId = 0;
    // #endregion Fields

    // #region Lifecycle
    // Called by GNOME Shell when the extension is enabled
    enable()
    {
        this._settings = this.getSettings();

        // Re-apply when the user picks another monitor in the preferences
        this._settingsChangedId = this._settings.connect(
            `changed::${SETTING_MONITOR_CONNECTOR}`,
            () => this._applyPanelMonitor());

        // The layout manager emits this AFTER it has repositioned the panel on the
        // primary monitor, so our handler always gets the last word
        this._monitorsChangedId = Main.layoutManager.connect(
            'monitors-changed',
            () => this._applyPanelMonitor());

        // When the extension is enabled during login, the shell is still starting up
        if (Main.layoutManager._startingUp)
        {
            this._startupCompleteId = Main.layoutManager.connect(
                'startup-complete',
                () => this._applyPanelMonitor());
        }

        this._applyPanelMonitor();
    }

    // Called by GNOME Shell when the extension is disabled. Must stay synchronous
    // (GNOME Shell 51 throws if disable() is async)
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

        // Put the panel back where GNOME Shell wants it (primary monitor)
        this._movePanelToMonitor(Main.layoutManager.primaryMonitor);

        this._settings = null;
    }
    // #endregion Lifecycle

    // #region Panel placement
    // Resolves the target monitor from the settings and moves the panel onto it
    _applyPanelMonitor()
    {
        const target = this._resolveTargetMonitor();
        this._movePanelToMonitor(target);
    }

    // Returns the monitor object (from Main.layoutManager.monitors) matching the
    // saved connector, or the primary monitor when unset / not connected
    _resolveTargetMonitor()
    {
        const primary = Main.layoutManager.primaryMonitor;
        const connector = this._settings.get_string(SETTING_MONITOR_CONNECTOR);

        // Empty value = default behavior
        if (connector === '')
        {
            return primary;
        }

        const index = this._getMonitorIndexForConnector(connector);

        // Connector not connected (or lookup failed): fall back to the primary monitor
        if (index < 0 || index >= Main.layoutManager.monitors.length)
        {
            return primary;
        }

        return Main.layoutManager.monitors[index];
    }

    // Asks Mutter which monitor index is driven by the given connector.
    // Returns -1 when the connector is unknown or the lookup is not possible
    _getMonitorIndexForConnector(connector)
    {
        try
        {
            const monitorManager = global.backend.get_monitor_manager();
            return monitorManager.get_monitor_for_connector(connector);
        }
        catch (e)
        {
            console.warn(`[${this.uuid}] Monitor lookup failed for connector "${connector}": ${e.message}`);
            return -1;
        }
    }

    // Moves and resizes the panel box (the container of Main.panel) onto a monitor.
    // The layout manager tracks panelBox as chrome, so work-area struts and
    // fullscreen handling follow automatically
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
