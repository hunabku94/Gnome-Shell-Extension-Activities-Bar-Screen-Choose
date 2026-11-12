// prefs.js
// Runs inside : the GNOME Extensions preferences window (its own process, outside GNOME Shell)

import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

// #region Settings keys
// A GSettings key that records the chosen monitor connector (an empty string
// indicates the primary display).
const SETTING_MONITOR_CONNECTOR = 'monitor-connector';
// #endregion Settings keys

export default class ActivitiesBarScreenChoosePreferences extends ExtensionPreferences
{
    // #region Fields
    // Settings object, the same schema the extension reads
    _settings = null;

    // A dropdown list displaying the available monitors to choose from
    _comboRow = null;

    // Connector per drop-down entry, index for index (empty string is the default entry)
    _connectors = [];

    // During the rebuild of the drop-down menu, selection events will be skipped.
    _isRebuilding = false;
    // #endregion Fields

    // #region Preferences window
    // Triggered to fill the settings pane
    fillPreferencesWindow(window)
    {
        this._settings = this.getSettings();

        const page = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: 'preferences-desktop-display-symbolic',
        });
        window.add(page);

        const group = new Adw.PreferencesGroup({
            title: _('Top bar'),
            description: _('Choose the screen that displays the top bar (Activities bar).'),
        });
        page.add(group);

        this._comboRow = new Adw.ComboRow({
            title: _('Screen'),
            subtitle: _('If the chosen screen is disconnected, the primary screen is used.'),
        });
        group.add(this._comboRow);

        this._comboRow.connect('notify::selected', () => this._onSelectionChanged());

        // Update the entries whenever a screen is connected or disconnected.
        const monitors = Gdk.Display.get_default().get_monitors();
        const monitorsChangedId = monitors.connect('items-changed', () => this._rebuildMonitorList());

        // When the window is closed, remove the signal handler and release the
        // references we maintain.
        window.connect('close-request', () =>
        {
            monitors.disconnect(monitorsChangedId);
            this._settings = null;
            this._comboRow = null;
            return false;
        });

        this._rebuildMonitorList();
    }
    // #endregion Preferences window

    // #region Monitor list
    // Repopulates the dropdown with the monitors currently connected
    _rebuildMonitorList()
    {
        const savedConnector = this._settings.get_string(SETTING_MONITOR_CONNECTOR);
        const labels = [_('Default (primary screen)')];
        this._connectors = [''];

        const monitors = Gdk.Display.get_default().get_monitors();
        for (let i = 0; i < monitors.get_n_items(); i++)
        {
            const monitor = monitors.get_item(i);
            const connector = monitor.get_connector();

            // Skip monitors displaying no connector name
            if (!connector)
            {
                continue;
            }

            const model = monitor.get_model();
            labels.push(model ? `${connector} - ${model}` : connector);
            this._connectors.push(connector);
        }

        // Continue to display the saved option even when the screen is disconnected
        // at the time.
        if (savedConnector !== '' && !this._connectors.includes(savedConnector))
        {
            labels.push(`${savedConnector} (${_('not connected')})`);
            this._connectors.push(savedConnector);
        }

        this._isRebuilding = true;
        this._comboRow.model = new Gtk.StringList({strings: labels});
        this._comboRow.selected = this._connectors.indexOf(savedConnector);
        this._isRebuilding = false;
    }

    // Stores the connector that goes with the chosen drop-down entry
    _onSelectionChanged()
    {
        if (this._isRebuilding)
        {
            return;
        }

        const connector = this._connectors[this._comboRow.selected];
        if (connector === undefined)
        {
            return;
        }

        this._settings.set_string(SETTING_MONITOR_CONNECTOR, connector);
    }
    // #endregion Monitor list
}
