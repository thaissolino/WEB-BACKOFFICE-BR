import { type ReactNode } from "react";
import { PDV_MENUS, type PdvMenuItem } from "../../client/dashboard/menuData";
import {
  PDV_CONFIG_MODAL_COLUMNS,
  PDV_DASHBOARD_WIDGETS,
  isMenuChecked,
  isNavVisible,
  setMenuChecked,
  type PdvNavId,
  type PdvUiConfig,
} from "../../client/dashboard/pdvUiConfig";
import "./pdvVisibility.css";

function VisibilityCheck({
  checked,
  dimmed,
  root,
  label,
  onChange,
}: {
  checked: boolean;
  dimmed?: boolean;
  root?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="pdv-vis-check" data-dim={dimmed ? "true" : undefined} data-root={root ? "true" : undefined}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function MenuTree({
  items,
  parentPath,
  parentOff,
  config,
  onChange,
}: {
  items: PdvMenuItem[];
  parentPath: string[];
  parentOff: boolean;
  config: PdvUiConfig;
  onChange: (next: PdvUiConfig) => void;
}) {
  return (
    <>
      {items.map((item) => {
        const path = [...parentPath, item.id];
        const checked = isMenuChecked(config, path);
        return (
          <div key={item.id}>
            <VisibilityCheck
              checked={checked}
              dimmed={parentOff}
              label={item.label}
              onChange={(on) => onChange(setMenuChecked(config, path, on))}
            />
            {item.children?.length ? (
              <div className="pdv-vis-children">
                <MenuTree
                  items={item.children}
                  parentPath={path}
                  parentOff={parentOff || !checked}
                  config={config}
                  onChange={onChange}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </>
  );
}

export default function PdvVisibilityEditor({
  value,
  onChange,
  toolbar,
}: {
  value: PdvUiConfig;
  onChange: (next: PdvUiConfig) => void;
  toolbar?: () => ReactNode;
}) {
  return (
    <div className="pdv-vis">
      {toolbar ? <div className="pdv-vis-savebar">{toolbar()}</div> : null}
      <p className="pdv-vis-intro">
        Desmarque o que o lojista não deve ver. Tudo começa ligado. As mudanças só entram no PDV
        depois de Salvar / Atualizar. Se um menu pai estiver desligado, os filhos somem no PDV
        mesmo que continuem marcados aqui.
      </p>

      <div className="pdv-vis-block">
        <span className="pdv-vis-kicker">Menus do PDV</span>
        <div className="pdv-vis-menus">
          {PDV_MENUS.map((root) => {
            const navId = root.id as PdvNavId;
            const navOn = isNavVisible(value, navId);
            return (
              <div className="pdv-vis-col" key={root.id}>
                <VisibilityCheck
                  root
                  checked={navOn}
                  label={root.label}
                  onChange={(on) =>
                    onChange({
                      ...value,
                      nav: { ...value.nav, [navId]: on },
                    })
                  }
                />
                <MenuTree
                  items={root.items}
                  parentPath={[]}
                  parentOff={!navOn}
                  config={value}
                  onChange={onChange}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="pdv-vis-block" style={{ marginTop: 28 }}>
        <span className="pdv-vis-kicker">Painel inicial</span>
        <div className="pdv-vis-widgets">
          {PDV_DASHBOARD_WIDGETS.map((widget) => (
            <VisibilityCheck
              key={widget.id}
              checked={value.dashboard[widget.id] !== false}
              label={widget.label}
              onChange={(on) =>
                onChange({
                  ...value,
                  dashboard: { ...value.dashboard, [widget.id]: on },
                })
              }
            />
          ))}
        </div>
      </div>

      <div className="pdv-vis-block" style={{ marginTop: 28 }}>
        <span className="pdv-vis-kicker">Modal Configuração</span>
        <div className="pdv-vis-cfg">
          {PDV_CONFIG_MODAL_COLUMNS.map((column) => (
            <div className="pdv-vis-cfg-col" key={column.map((section) => section.id).join("-")}>
              {column.map((section) => (
                <div key={section.id}>
                  <h3 className="pdv-vis-section-title">{section.title}</h3>
                  {section.items.map((item) => (
                    <VisibilityCheck
                      key={item.id}
                      checked={value.configModal[item.id] !== false}
                      label={item.label}
                      onChange={(on) =>
                        onChange({
                          ...value,
                          configModal: { ...value.configModal, [item.id]: on },
                        })
                      }
                    />
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {toolbar ? <div className="pdv-vis-savebar pdv-vis-savebar-end">{toolbar()}</div> : null}
    </div>
  );
}
