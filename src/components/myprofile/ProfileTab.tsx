/**
 * PROFILE TAB — the editable personal fields, as flat 40 px rows.
 *
 * Nothing here duplicates the identity card: role and blocks are NOT repeated
 * as disabled inputs, and the email lives on the card only. Phone shows a
 * clear "Not set" state (never the old sample number as a placeholder) and is
 * normalised to E.164 with the default country code by the central config.
 *
 * Language is a preference, so committing it saves instantly (the page shows
 * "Saved ✓ · Undo"); the other three rows go into the Save-bar draft.
 */

import { EditableRow } from "@/components/FieldEditor";
import {
  formatPhone,
  isSamplePhone,
  normalizePhone,
  PHONE_HINT,
  validateProfileField,
} from "@/lib/profileConfig";

export type ProfileDraft = {
  name: string;
  designation: string;
  phone: string;
};

export default function ProfileTab({
  values,
  language,
  onCommit,
  onLanguage,
}: {
  values: ProfileDraft;
  language: string;
  onCommit: (key: keyof ProfileDraft, value: string) => void;
  onLanguage: (value: string) => void;
}) {
  const sample = isSamplePhone(values.phone);

  return (
    <section
      data-testid="profile-tab"
      className="rounded-xl border border-border/60 bg-card p-4"
      aria-label="Personal details"
    >
      <h2 className="text-sm font-semibold">Personal details</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        How your name appears in audits and exports.
      </p>

      <div className="mt-3 -mx-3 border-t border-border/40">
        <EditableRow
          testId="profile-field-name"
          label="Display name"
          value={values.name}
          validate={(v) => validateProfileField("name", v)}
          onCommit={(v) => onCommit("name", v)}
        />
        <EditableRow
          testId="profile-field-designation"
          label="Designation"
          value={values.designation}
          placeholder="Not set"
          validate={(v) => validateProfileField("designation", v)}
          onCommit={(v) => onCommit("designation", v)}
        />
        <EditableRow
          testId="profile-field-phone"
          label="Phone"
          value={values.phone}
          display={formatPhone(values.phone)}
          type="tel"
          placeholder="Not set"
          validate={(v) => (v.trim() ? normalizePhone(v).error : null)}
          onCommit={(v) => onCommit("phone", normalizePhone(v).value)}
        />
        <EditableRow
          testId="profile-field-language"
          label="Language"
          value={language}
          display={language === "ta" ? "தமிழ் (Tamil)" : "English"}
          type="select"
          options={[
            { value: "en", label: "English" },
            { value: "ta", label: "தமிழ் (Tamil) — coming soon" },
          ]}
          onCommit={onLanguage}
        />
      </div>

      <p className="mt-3 text-[11px] leading-snug text-muted-foreground">
        {sample
          ? "The stored phone number is the old sample value — open the row and enter your own number, or clear it."
          : `Phone numbers keep the country code (${PHONE_HINT}).`}
      </p>
    </section>
  );
}
