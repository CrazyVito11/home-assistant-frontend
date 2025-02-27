import "@lrnwebcomponents/simple-tooltip/simple-tooltip";
import { mdiDelete, mdiDownload, mdiPlus } from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoize from "memoize-one";
import { relativeTime } from "../../../common/datetime/relative_time";
import type { DataTableColumnContainer } from "../../../components/data-table/ha-data-table";
import "../../../components/ha-circular-progress";
import "../../../components/ha-fab";
import "../../../components/ha-icon";
import "../../../components/ha-icon-overflow-menu";
import "../../../components/ha-svg-icon";
import { getSignedPath } from "../../../data/auth";
import type { BackupContent, BackupData } from "../../../data/backup";
import {
  fetchBackupInfo,
  generateBackup,
  getBackupDownloadUrl,
  removeBackup,
} from "../../../data/backup";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-loading-screen";
import "../../../layouts/hass-tabs-subpage-data-table";
import type { HomeAssistant, Route } from "../../../types";
import type { LocalizeFunc } from "../../../common/translations/localize";
import { fileDownload } from "../../../util/file_download";

@customElement("ha-config-backup")
class HaConfigBackup extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _backupData?: BackupData;

  private _columns = memoize(
    (
      narrow,
      _language,
      localize: LocalizeFunc
    ): DataTableColumnContainer<BackupContent> => ({
      name: {
        title: localize("ui.panel.config.backup.name"),
        main: true,
        sortable: true,
        filterable: true,
        flex: 2,
        template: narrow
          ? undefined
          : (backup) =>
              html`${backup.name}
                <div class="secondary">${backup.path}</div>`,
      },
      path: {
        title: localize("ui.panel.config.backup.path"),
        hidden: !narrow,
      },
      size: {
        title: localize("ui.panel.config.backup.size"),
        filterable: true,
        sortable: true,
        template: (backup) => Math.ceil(backup.size * 10) / 10 + " MB",
      },
      date: {
        title: localize("ui.panel.config.backup.created"),
        direction: "desc",
        filterable: true,
        sortable: true,
        template: (backup) =>
          relativeTime(new Date(backup.date), this.hass.locale),
      },

      actions: {
        title: "",
        type: "overflow-menu",
        showNarrow: true,
        hideable: false,
        moveable: false,
        template: (backup) =>
          html`<ha-icon-overflow-menu
            .hass=${this.hass}
            .narrow=${this.narrow}
            .items=${[
              // Download Button
              {
                path: mdiDownload,
                label: this.hass.localize(
                  "ui.panel.config.backup.download_backup"
                ),
                action: () => this._downloadBackup(backup),
              },
              // Delete button
              {
                path: mdiDelete,
                label: this.hass.localize(
                  "ui.panel.config.backup.remove_backup"
                ),
                action: () => this._removeBackup(backup),
              },
            ]}
            style="color: var(--secondary-text-color)"
          >
          </ha-icon-overflow-menu>`,
      },
    })
  );

  private _getItems = memoize((backupItems: BackupContent[]) =>
    backupItems.map((backup) => ({
      name: backup.name,
      slug: backup.slug,
      date: backup.date,
      size: backup.size,
      path: backup.path,
    }))
  );

  protected render(): TemplateResult {
    if (!this.hass || this._backupData === undefined) {
      return html`<hass-loading-screen></hass-loading-screen>`;
    }

    return html`
      <hass-tabs-subpage-data-table
        has-fab
        .tabs=${[
          {
            translationKey: "ui.panel.config.backup.caption",
            path: `/config/backup`,
          },
        ]}
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config/system"
        .route=${this.route}
        .columns=${this._columns(
          this.narrow,
          this.hass.language,
          this.hass.localize
        )}
        .data=${this._getItems(this._backupData.backups)}
        .noDataText=${this.hass.localize("ui.panel.config.backup.no_backups")}
        .searchLabel=${this.hass.localize(
          "ui.panel.config.backup.picker.search"
        )}
      >
        <ha-fab
          slot="fab"
          ?disabled=${this._backupData.backing_up}
          .label=${this._backupData.backing_up
            ? this.hass.localize("ui.panel.config.backup.creating_backup")
            : this.hass.localize("ui.panel.config.backup.create_backup")}
          extended
          @click=${this._generateBackup}
        >
          ${this._backupData.backing_up
            ? html`<ha-circular-progress
                slot="icon"
                indeterminate
              ></ha-circular-progress>`
            : html`<ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>`}
        </ha-fab>
      </hass-tabs-subpage-data-table>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this._getBackups();
  }

  private async _getBackups(): Promise<void> {
    this._backupData = await fetchBackupInfo(this.hass);
  }

  private async _downloadBackup(backup: BackupContent): Promise<void> {
    const signedUrl = await getSignedPath(
      this.hass,
      getBackupDownloadUrl(backup.slug)
    );
    fileDownload(signedUrl.path);
  }

  private async _generateBackup(): Promise<void> {
    const confirm = await showConfirmationDialog(this, {
      title: this.hass.localize("ui.panel.config.backup.create.title"),
      text: this.hass.localize("ui.panel.config.backup.create.description"),
      confirmText: this.hass.localize("ui.panel.config.backup.create.confirm"),
    });
    if (!confirm) {
      return;
    }

    generateBackup(this.hass)
      .then(() => this._getBackups())
      .catch((err) => showAlertDialog(this, { text: (err as Error).message }));

    await this._getBackups();
  }

  private async _removeBackup(backup: BackupContent): Promise<void> {
    const confirm = await showConfirmationDialog(this, {
      title: this.hass.localize("ui.panel.config.backup.remove.title"),
      text: this.hass.localize("ui.panel.config.backup.remove.description", {
        name: backup.name,
      }),
      confirmText: this.hass.localize("ui.panel.config.backup.remove.confirm"),
    });
    if (!confirm) {
      return;
    }

    await removeBackup(this.hass, backup.slug);
    await this._getBackups();
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        ha-fab[disabled] {
          --mdc-theme-secondary: var(--disabled-text-color) !important;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-backup": HaConfigBackup;
  }
}
