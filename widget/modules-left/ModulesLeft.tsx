import WidgetManager from "../../WidgetManager"

export function ModulesLeft() {


    const button = (
        <button
            onClicked={() => {
                let settings = WidgetManager.GetSettingsWindow();
                settings?.Apps();
                settings?.toggle();
            }}
            cssName={"bar-module-button"
            }>
            <label label="" />
        </button>
    ) as any;

    return button;
}
