# Makefile
# Developer helpers for the extension (not shipped inside the extension zip)

UUID := activities-bar-screen-choose@hunabku94.github.io
INSTALL_DIR := $(HOME)/.local/share/gnome-shell/extensions/$(UUID)

.PHONY: schemas install uninstall pack

# Compile the GSettings schema in place
schemas:
	glib-compile-schemas --strict schemas/

# Copy the extension into the user extensions folder (restart the session to load it)
install: schemas
	mkdir -p $(INSTALL_DIR)
	cp -r metadata.json extension.js prefs.js schemas $(INSTALL_DIR)/
	@echo "Installed to $(INSTALL_DIR)"
	@echo "Log out / log in (Wayland), then: gnome-extensions enable $(UUID)"

# Remove the installed copy
uninstall:
	rm -rf $(INSTALL_DIR)

# Build an installable zip with gnome-extensions
pack:
	gnome-extensions pack --force .
