import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-icon-picker";
import "../../../../components/ha-switch";
import type { HaSwitch } from "../../../../components/ha-switch";
import "../../../../components/ha-textfield";
import "../../../../components/ha-selector/ha-selector-boolean";
import type { Counter } from "../../../../data/counter";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";

@customElement("ha-counter-form")
class HaCounterForm extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public new = false;

  private _item?: Partial<Counter>;

  @state() private _name!: string;

  @state() private _icon!: string;

  @state() private _maximum?: number;

  @state() private _minimum?: number;

  @state() private _wrap_around?: boolean;

  @state() private _restore?: boolean;

  @state() private _initial?: number;

  @state() private _step?: number;

  set item(item: Counter) {
    this._item = item;
    if (item) {
      this._name = item.name || "";
      this._icon = item.icon || "";
      this._maximum = item.maximum ?? undefined;
      this._minimum = item.minimum ?? undefined;
      this._restore = item.restore ?? true;
      this._step = item.step ?? 1;
      this._wrap_around = item.wrap_around ?? false;
      this._initial = item.initial ?? 0;
    } else {
      this._name = "";
      this._icon = "";
      this._maximum = undefined;
      this._minimum = undefined;
      this._restore = true;
      this._step = 1;
      this._wrap_around = false;
      this._initial = 0;
    }
  }

  public focus() {
    this.updateComplete.then(() =>
      (
        this.shadowRoot?.querySelector("[dialogInitialFocus]") as HTMLElement
      )?.focus()
    );
  }

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    return html`
      <div class="form">
        <ha-textfield
          .value=${this._name}
          .configValue=${"name"}
          @input=${this._valueChanged}
          .label=${this.hass!.localize(
            "ui.dialogs.helper_settings.generic.name"
          )}
          autoValidate
          required
          .validationMessage=${this.hass!.localize(
            "ui.dialogs.helper_settings.required_error_msg"
          )}
          dialogInitialFocus
        ></ha-textfield>
        <ha-selector-boolean
          .value=${this._wrap_around}
          .configValue=${"wrap_around"}
          @value-changed=${this._valueChanged}
          .label=${this.hass!.localize(
            "ui.dialogs.helper_settings.counter.wrap_around"
          )}
          .helper=${this.hass!.localize(
            "ui.dialogs.helper_settings.counter.wrap_around_helper"
          )}
        ></ha-selector-boolean>
        <ha-icon-picker
          .hass=${this.hass}
          .value=${this._icon}
          .configValue=${"icon"}
          @value-changed=${this._valueChanged}
          .label=${this.hass!.localize(
            "ui.dialogs.helper_settings.generic.icon"
          )}
        ></ha-icon-picker>
        <ha-textfield
          .value=${this._minimum}
          .configValue=${"minimum"}
          type="number"
          @input=${this._valueChanged}
          .required=${this._wrap_around}
          .label=${this.hass!.localize(
            "ui.dialogs.helper_settings.counter.minimum"
          )}
        ></ha-textfield>
        <ha-textfield
          .value=${this._maximum}
          .configValue=${"maximum"}
          type="number"
          @input=${this._valueChanged}
          .required=${this._wrap_around}
          .label=${this.hass!.localize(
            "ui.dialogs.helper_settings.counter.maximum"
          )}
        ></ha-textfield>
        <ha-textfield
          .value=${this._initial}
          .configValue=${"initial"}
          type="number"
          @input=${this._valueChanged}
          .label=${this.hass!.localize(
            "ui.dialogs.helper_settings.counter.initial"
          )}
        ></ha-textfield>
        ${this.hass.userData?.showAdvanced
          ? html`
              <ha-textfield
                .value=${this._step}
                .configValue=${"step"}
                type="number"
                @input=${this._valueChanged}
                .label=${this.hass!.localize(
                  "ui.dialogs.helper_settings.counter.step"
                )}
              ></ha-textfield>
              <div class="row">
                <ha-switch
                  .checked=${this._restore}
                  .configValue=${"restore"}
                  @change=${this._valueChanged}
                >
                </ha-switch>
                <div>
                  ${this.hass.localize(
                    "ui.dialogs.helper_settings.counter.restore"
                  )}
                </div>
              </div>
            `
          : ""}
      </div>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    if (!this.new && !this._item) {
      return;
    }
    ev.stopPropagation();
    const target = ev.target as any;
    const configValue = target.configValue;
    let value = ev.detail?.value ?? target.value;

    if (target.type === "number") {
      if (value !== "") {
        value = Number(value);
      } else {
        value = undefined;
      }
    } else if (target.localName === "ha-switch") {
      value = (ev.target as HaSwitch).checked;
    }

    if (this[`_${configValue}`] === value) {
      return;
    }
    const newValue = { ...this._item };
    if (value === undefined || value === "") {
      delete newValue[configValue];
    } else {
      newValue[configValue] = value;
    }
    fireEvent(this, "value-changed", {
      value: newValue,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .form {
          color: var(--primary-text-color);
        }
        .row {
          margin-top: 12px;
          margin-bottom: 12px;
          color: var(--primary-text-color);
          display: flex;
          align-items: center;
        }
        .row div {
          margin-left: 16px;
          margin-inline-start: 16px;
          margin-inline-end: initial;
        }
        ha-textfield {
          display: block;
          margin: 8px 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-counter-form": HaCounterForm;
  }
}
