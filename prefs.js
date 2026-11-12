// prefs.js
// Attaches to : GNOME Extensions preferences window (runs in a separate process, not in GNOME Shell)

import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

// #region Settings keys
// GSettings key holding the connector name of the chosen monitor ('' = primary)
const SETTING_MONITOR_CONNECTOR = 'monitor-connector';
// #endregion Settings keys

export default class ActivitiesBarScreenChoosePreferences extends ExtensionPreferences
{
    // #region Fields
    // GSettings instance shared with the extension
    _settings = null;

    // Combo row listing the available monitors
    _comboRow = null;

    // Connector names, same order as the combo row entries ('' = default)
    _connectors = [];

    // True while the combo row is being rebuilt (ignore selection signals)
    _isRebuilding = false;
    // #endregion Fields

    // #region Preferences window
    // Called by GNOME Shell to build the preferences UI
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

        // Keep the list up to date when screens are plugged / unplugged
        const monitors = Gdk.Display.get_default().get_monitors();
        const monitorsChangedId = monitors.connect('items-changed', () => this._rebuildMonitorList());

        // Release the signal and our references when the window is closed
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
    // Rebuilds the combo row entries from the monitors currently connected
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

            // Skip monitors without a usable connector name
            if (!connector)
            {
                continue;
            }

            const model = monitor.get_model();
            labels.push(model ? `${connector} - ${model}` : connector);
            this._connectors.push(connector);
        }

        // Keep the saved choice visible even if that screen is currently unplugged
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

    // Saves the connector matching the selected combo row entry
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
