import { canDeleteAccount, normalizeConfirmWord } from "../src/utils/deleteAccountConfirm";

describe("delete-account confirmation", () => {
  test("normalizeConfirmWord uppercases + trims", () => {
    expect(normalizeConfirmWord(" eliminar ")).toBe("ELIMINAR");
    expect(normalizeConfirmWord("Delete")).toBe("DELETE");
  });

  test("normalizeConfirmWord falls back when missing", () => {
    expect(normalizeConfirmWord(undefined)).toBe("DELETE");
    expect(normalizeConfirmWord("   ")).toBe("DELETE");
    expect(normalizeConfirmWord(null, "CONFIRM")).toBe("CONFIRM");
  });

  test("canDeleteAccount accepts localized word", () => {
    expect(canDeleteAccount("ELIMINAR", "ELIMINAR")).toBe(true);
    expect(canDeleteAccount("eliminar", "ELIMINAR")).toBe(true);
    expect(canDeleteAccount("DELETE", "ELIMINAR")).toBe(true); // universal fallback
    expect(canDeleteAccount("REMOVE", "ELIMINAR")).toBe(false);
  });
});
