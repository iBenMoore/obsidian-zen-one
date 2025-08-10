import {setIcon, View, WorkspaceLeaf, App} from "obsidian";
import {VIEW_TYPE_ZEN} from "../constants";
import Zen from "../main";
import {GlobalPreferences, ZenPreferences} from "../utils/types";

export class ZenLeaf extends WorkspaceLeaf {
	tabHeaderEl: HTMLElement;

	tabHeaderInnerIconEl: HTMLElement;
}

export class ZenView extends View {
	leaf: ZenLeaf;

	headerIcon: HTMLElement;

	plugin: Zen;

	navigation: true;

	constructor(leaf: ZenLeaf, plugin: Zen) {
		super(leaf);
		this.leaf = leaf;
		this.plugin = plugin;
		this.addGlobalClasses();
	}

	onunload() {
		if (this.headerIcon) {
			this.headerIcon.remove();
		}
		this.removeGlobalClasses();
		super.onunload();
	}

	onload() {
		if (this.app.workspace.leftSplit) {
			this.createHeaderIcon();
		}

		this.leaf.tabHeaderEl.draggable = false;

		this.updateClass();

		this.addEventListeners();

		super.onload();
	}

	async toggleZen(activePaneOnly = false) {
		this.plugin.settings.enabled = !this.plugin.settings.enabled;

		(this.plugin.settings.enabled && activePaneOnly) 
			? this.plugin.settings.activePaneOnly = true 
			: this.plugin.settings.activePaneOnly = false;

	// Make sure a real root node is active/focused.
	// This is especially important for Zen One (Active Pane Only) Mode,
	// as it prevents blank screens from happening if a sidebar element is currently selected.	
	if(this.plugin.settings.enabled && activePaneOnly 
		&& this.app.workspace.getMostRecentLeaf(this.app.workspace.rootSplit)
		&& typeof this.app.workspace.getMostRecentLeaf(this.app.workspace.rootSplit)! != "undefined")
		this.app.workspace.setActiveLeaf(this.app.workspace.getMostRecentLeaf(this.app.workspace.rootSplit)!);
	
		if (this.plugin.settings.preferences.fullScreen) {
			this.plugin.settings.enabled ? this.containerEl.doc.body.requestFullscreen() : this.containerEl.doc.exitFullscreen();
		}

		await this.plugin.saveSettings();
		await this.updateClass();
		// Added to make sure the ribbon toggle button doesn't jump around or temporarily hide when
		// it's not supposed to.  onLayoutChange works for this, but isn't officially exposed in the
		// Obsidian API, don't know if there is a cleaner way to do this.
		// @ts-ignore
		await this.app.workspace.onLayoutChange();		
	}

	addEventListeners() {
		this.leaf.tabHeaderEl.addEventListener("click", async (e: any) => {
			e.stopPropagation();
			e.preventDefault();
			await this.toggleZen(e.shiftKey);
		});
	}

	// This is the Zen enable/disable icon that appears when you are in Zen mode
  	// in the root workspace header, not the main activate icon in the left sidebar.
	createHeaderIcon() {
		let headerIcon = createEl("div", {
			cls: "zen-header",
			attr: {"data-zen": "icon", "aria-label": "Zen - Disable", "aria-label-position": "bottom"}
		});

		let headerInner = createEl("div", {cls: "zen-header-inner"});
		setIcon(headerInner, 'eye-off');

		headerInner.addEventListener("click", async () => {
			await this.toggleZen();
		});

		headerIcon.appendChild(headerInner);
		this.headerIcon = headerIcon;

		let timer: ReturnType<typeof setTimeout>;
		this.containerEl.doc.onmousemove = () => {
			this.containerEl.doc.body.removeClass("zen-module--autoHideShow__hide");

			if (!this.plugin.settings.enabled) return;
			if (!this.plugin.settings.preferences.sideDockLeft) return;
			if (!this.plugin.settings.preferences.autoHideZen) return;

			clearTimeout(timer);
			timer = setTimeout(() => {
				this.containerEl.doc.body.addClass("zen-module--autoHideShow__hide");
			}, 1000);
		};

		// @ts-ignore
		this.app.workspace.leftSplit.getContainer().containerEl.appendChild(headerIcon);
	}

	addBodyClasses(addBaseClass?: boolean): void {
		if (addBaseClass) {
			this.containerEl.doc.body.addClass("zen-enabled");
		}
		Object.keys(this.plugin.settings.preferences).map((key: string) => {
			if (this.plugin.settings.preferences[key as keyof ZenPreferences]) {
				this.containerEl.doc.body.addClass("zen-module--" + key);
			}
		})
	}
	addGlobalClasses(): void {
		Object.keys(this.plugin.settings.global).map((key: string) => {
			if (this.plugin.settings.global[key as keyof GlobalPreferences]) {
				this.containerEl.doc.body.addClass("zen-global--" + key);
			}
		})
	}
	removeGlobalClasses(): void {
		this.containerEl.doc.body.className = this.containerEl.doc.body.className.split(" ").filter(c => !c.startsWith("zen-global--")).join(" ").trim();
	}


	removeBodyClasses(removeBaseClass?: boolean): void {
		if (removeBaseClass) {
			this.containerEl.doc.body.removeClass("zen-enabled");
		}
		this.containerEl.doc.body.className = this.containerEl.doc.body.className.split(" ").filter(c => !c.startsWith("zen-module--")).join(" ").trim();
	}

	async updateClass(): Promise<void> {

		setIcon(this.leaf.tabHeaderInnerIconEl, this.plugin.settings.enabled ? 'eye-off' : 'eye');

		this.leaf.tabHeaderInnerIconEl.setAttr("aria-label", this.plugin.settings.enabled ? "Zen - Disable" : "Zen - Enable (or Shift + Click  for Zen One \"Active Pane Only\")");


		if (this.plugin.settings.enabled) {
			this.removeBodyClasses();
			this.addBodyClasses(true);

			if (this.plugin.settings.activePaneOnly) {
				this.containerEl.doc.body.addClass("zen-activePaneOnly");
				// Apply this class directly to the currently active pane,
				// so that we have control to keep it active and visible even if certain events occur
				// like selecting a popout window, a hover editor window, etc.
				if(this.app.workspace.containerEl.querySelector('.mod-root .workspace-tabs.mod-active') != null) 
					this.app.workspace.containerEl.querySelector('.mod-root .workspace-tabs.mod-active')!.addClass("zen-activePaneOnly");
			  }			

			this.plugin.integrator.enableIntegrations();

		} else {
			this.removeBodyClasses(true);

			this.containerEl.doc.body.removeClass("zen-activePaneOnly");
			if(this.app.workspace.containerEl.querySelector('.mod-root .workspace-tabs.zen-activePaneOnly') != null) 
				this.app.workspace.containerEl.querySelector('.mod-root .workspace-tabs.zen-activePaneOnly')!.removeClass("zen-activePaneOnly");

			this.plugin.integrator.disableIntegrations();
		}

		await this.plugin.saveSettings();
	}

	getViewType(): string {
		return VIEW_TYPE_ZEN;
	}

	getDisplayText(): string {
		return 'Zen - Enable (or Shift + Click  for Zen One \"Active Pane Only\")';
	}

	getIcon(): string {
		return !this.plugin.settings.enabled ? 'eye' : 'eye-off';
	}
}
