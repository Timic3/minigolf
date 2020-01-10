import { Engine } from "../Engine";

enum DialogType {
    YES_NO, OK
}

export class UI {
    public static currentScreen = 'loading';
    private static engine: Engine;
    private static forceValue;

    public static initialize(engine) {
        document.getElementById('menu__start').addEventListener('click', () => {
            this.screen('game');
            this.engine.run();
        });
        document.getElementById('menu__options').addEventListener('click', () => {
            // Not implemented yet
            UI.dialog('This is not implemented yet.', DialogType.OK, window.close);
        });
        document.getElementById('menu__exit').addEventListener('click', () => {
            UI.dialog('Are you sure you want to exit?', DialogType.YES_NO, window.close);
        });
        this.forceValue = document.getElementById('force__value');

        this.engine = engine;
    }

    public static flow(element: string, information: string) {
        document.getElementById('flow__' + element).innerText = information;
    }

    public static screen(element: string) {
        document.getElementById('screen__' + UI.currentScreen).hidden = true;
        document.getElementById('screen__' + element).hidden = false;
        UI.currentScreen = element;
    }

    public static dialog(text: string, type: DialogType, yes: Function) {
        document.getElementById('dialog__yes_no').hidden = true;
        document.getElementById('dialog__ok').hidden = true;

        document.getElementById('dialog__text').innerText = text;
        if (type === DialogType.YES_NO) {
            document.getElementById('dialog__yes_no').hidden = false;
            document.getElementById('dialog__no').addEventListener('click', () => {
                document.getElementById('dialog').hidden = true;
            });
            document.getElementById('dialog__yes').addEventListener('click', () => {
                yes();
            });
        } else if (type === DialogType.OK) {
            document.getElementById('dialog__ok').hidden = false;
            document.getElementById('dialog__okay').addEventListener('click', () => {
                document.getElementById('dialog').hidden = true;
            });
        }
        document.getElementById('dialog').hidden = false;
    }

    public static force(ratio: number) {
        if (this.forceValue) {
            this.forceValue.style.transform = 'scaleY(' + ratio + ')';
            // this.forceValue.style.webkitTransform = 'scaleY(' + ratio + ')';
        }
    }
}