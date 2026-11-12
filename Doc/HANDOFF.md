# HANDOFF - Activities Bar Screen Choose

Journal des conversations entre Claude et le développeur. À actualiser après chaque séance.

## Contexte

- Objectif : une extension pour GNOME Shell permettant de déterminer sur quel écran s'affiche la barre d'activités, et non sur l'écran principal uniquement.
- Environnement : Arch Linux, version 51.1 de GNOME Shell (Wayland).
- UUID : `activities-bar-screen-choose@hunabku94.github.io`
- Schéma GSettings : `org.gnome.shell.extensions.activities-bar-screen-choose`

## Session 1 - 2026-11-12

### Fait

- Structure de l'extension : `metadata.json`, `extension.js`, `prefs.js`, `schemas/`, `Makefile`.
- Principe : `Main.layoutManager.panelBox` (conteneur de `Main.panel`) est déplacé sur le moniteur sélectionné. Il est géré comme un élément « chrome » par le layout manager, ce qui signifie que les struts (aires de travail des fenêtres) et le mode plein écran s'adaptent en conséquence.
- Le moniteur est identifié par son **connecteur** (ex. `DP-1`, `HDMI-A-1`), stable contrairement à l'index. Résolution via `global.backend.get_monitor_manager().get_monitor_for_connector()`.
- Repli automatique sur l'écran principal si le connecteur est vide ou débranché.
- Réapplication sur le signal `monitors-changed` du layout manager (émis après son propre repositionnement) et au `startup-complete`.
- `disable()` synchrone (obligatoire en GNOME 51) et remet le panneau sur l'écran principal.
- Préférences Adw : menu déroulant des écrans (via `Gdk.Display`), actualisation lors de la connexion/déconnexion.
- Versions déclarées : 49, 50, 51 (seule la 51 est prise en compte pour les tests).

### Limites connues / à vérifier

- Le coin actif (hot corner) et la vue d'ensemble restent sur l'écran principal : seule la barre est déplacée.
- Non testé en session réelle au moment de l'écriture (pas de GNOME Shell dans l'environnement de développement de Claude). Seuls la syntaxe JS, le JSON et le schéma ont été validés.
- `Main.layoutManager._startingUp` est un champ privé du shell, utilisé uniquement pour savoir s'il faut attendre `startup-complete`.

### Tests à effectuer

1. Installer : `make install` ; fermer ensuite sa session avant de l'ouvrir à nouveau ; activer l'extension en exécutant `gnome-extensions enable activities-bar-screen-choose@hunabku94.github.io`.
2. Ouvrir les préférences : `gnome-extensions prefs activities-bar-screen-choose@hunabku94.github.io`. La liste doit afficher « Par défaut » suivi de chaque écran avec son connecteur.
3. Sélectionner un écran supplémentaire : la barre devrait se déplacer instantanément, avec la bonne taille.
4. Maximiser une fenêtre sur chaque écran : la zone de travail doit tenir compte de la barre uniquement sur l'écran choisi.
5. Lancer une vidéo en plein écran sur l'écran choisi : la barre doit se masquer.
6. Débrancher l'écran choisi : la barre revient sur l'écran principal ; rebrancher : elle retourne sur l'écran choisi.
7. Relancer la session : l'option demeure.
8. Désactiver l'extension : la barre revient sur l'écran principal.
9. Vérifier les erreurs : `journalctl -f -o cat /usr/bin/gnome-shell`.

### Pistes suivantes

- Option pour déplacer aussi le coin actif.
- Traductions (gettext) des messages des paramètres.
- Publication sur extensions.gnome.org (`make pack`).
