"use client";

import { type FormEvent } from "react";

export function ContactFormFields({ buttonLabel }: { buttonLabel: string }) {
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.currentTarget.reportValidity();
  }

  return (
    <form className="cms-contact-form-card" onSubmit={onSubmit}>
      <div className="cms-contact-form-grid">
        <div className="cms-contact-form-fields">
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            aria-label="E-post"
            placeholder="E-post *"
          />
          <div className="cms-contact-form-names">
            <input
              type="text"
              name="given-name"
              autoComplete="given-name"
              aria-label="Förnamn"
              placeholder="Förnamn"
            />
            <input
              type="text"
              name="family-name"
              autoComplete="family-name"
              aria-label="Efternamn"
              placeholder="Efternamn"
            />
          </div>
          <input
            type="text"
            name="organization"
            autoComplete="organization"
            aria-label="Företag"
            placeholder="Företag"
          />
        </div>
        <textarea name="message" aria-label="Meddelande" placeholder="Message" />
      </div>
      <button type="submit" className="cms-contact-form-submit">
        {buttonLabel}
      </button>
    </form>
  );
}
