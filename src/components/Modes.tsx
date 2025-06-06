import { JSX } from "solid-js";

type Mode =
  | "normal"
  | "move"
  | `add-rectangle`
  | `add-ellipse`
  | `add-text`
  | "add-line"
  | "add-arrow"
  | "clear-shapes";

type ButtonData = {
  mode: Mode;
  icon: JSX.Element;
  label: string;
  customAction?: () => void;
};

type NavBarProps = {
  setMode: (mode: Mode) => void;
  clearShapes: () => void;
};

export default function Modes({ setMode, clearShapes }: NavBarProps) {
  const buttons: ButtonData[] = [
    {
      mode: "move",
      label: "Move",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-hand-icon lucide-hand"
        >
          <path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2" />
          <path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2" />
          <path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8" />
          <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
        </svg>
      ),
    },
    {
      mode: "normal",
      label: "Select",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-mouse-pointer2-icon lucide-mouse-pointer-2"
        >
          <path d="M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z" />
        </svg>
      ),
    },
    {
      mode: "add-rectangle",
      label: "Rectangle",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-square-icon lucide-square"
        >
          <rect width="18" height="18" x="3" y="3" rx="2" />
        </svg>
      ),
    },
    {
      mode: "add-ellipse",
      label: "Ellipse",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-circle-icon lucide-circle"
        >
          <circle cx="12" cy="12" r="10" />
        </svg>
      ),
    },
    {
      mode: "add-text",
      label: "Text",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-letter-text-icon lucide-letter-text"
        >
          <path d="M15 12h6" />
          <path d="M15 6h6" />
          <path d="m3 13 3.553-7.724a.5.5 0 0 1 .894 0L11 13" />
          <path d="M3 18h18" />
          <path d="M3.92 11h6.16" />
        </svg>
      ),
    },
    {
      mode: "add-line",
      label: "Line",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-minus-icon lucide-minus"
        >
          <path d="M5 12h14" />
        </svg>
      ),
    },
    {
      mode: "add-arrow",
      label: "Arrow",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-move-down-left-icon lucide-move-down-left"
        >
          <path d="M11 19H5V13" />
          <path d="M19 5L5 19" />
        </svg>
      ),
    },
    {
      mode: "clear-shapes",
      label: "Clear Shapes",
      customAction: () =>
        (
          document.getElementById("delete_modal")! as HTMLDialogElement
        ).showModal(),
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-trash2-icon lucide-trash-2"
        >
          <path d="M3 6h18" />
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          <line x1="10" x2="10" y1="11" y2="17" />
          <line x1="14" x2="14" y1="11" y2="17" />
        </svg>
      ),
    },
  ];

  return (
    <>
      <div class="card bg-base-100 w-min border border-base-300 h-min mt-2">
        <div class="card-body flex flex-row gap-3">
          {buttons.map(({ mode, icon, label, customAction }) => (
            <button
              class="btn scale-110 btn-square rounded-lg"
              onClick={() => (customAction ? customAction() : setMode(mode))}
              title={label}
              aria-label={label}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>
      <dialog id="delete_modal" class="modal">
        <div class="modal-box">
          <h3 class="font-bold mb-2 text-xl">
            You sure you want to delete all shapes?
          </h3>
          <p>This will clear the whole canvas.</p>
          <div class="modal-action">
            <form method="dialog" class="flex gap-1">
              <button class="btn">Cancel</button>
              <button class="btn btn-error" onClick={clearShapes}>
                Confirm
              </button>
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
}
