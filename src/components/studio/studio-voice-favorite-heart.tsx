"use client";

type Props = {
  favorite: boolean;
  disabled?: boolean;
  onToggle: () => void;
};

export function StudioVoiceFavoriteHeart({ favorite, disabled, onToggle }: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={favorite}
      aria-label={favorite ? "Verwijder uit favorieten" : "Bewaar als favoriet"}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle();
      }}
      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-zinc-200 bg-white text-lg leading-none text-[#0067B1] disabled:opacity-50"
    >
      {favorite ? "♥" : "♡"}
    </button>
  );
}
