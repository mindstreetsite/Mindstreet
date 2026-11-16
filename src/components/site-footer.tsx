import { footerDirectory, phoneHref, resolvedFooter } from "@/lib/cms/library";
import type { CmsFooter, CmsLink, CmsPage } from "@/lib/cms/types";

export function SiteFooter({
  footer,
  menu,
  pages,
}: {
  footer?: CmsFooter | null;
  menu?: CmsLink[];
  pages?: CmsPage[];
}) {
  const details = resolvedFooter(footer);
  const phone = details.phone.trim();
  const email = details.email.trim();
  const links = details.links.filter((link) => link.href.trim());
  const tel = phoneHref(phone);
  const directory = footerDirectory(menu, pages);
  const hasDirectory = directory.areas.length > 0 || directory.links.length > 0;
  const social =
    links.length > 0 ? (
      <div className="footer-links">
        {links.map((link, index) => (
          <a
            key={`${link.href}-${index}`}
            className="linkedin"
            href={link.href.trim()}
            target="_blank"
            rel="noreferrer"
            aria-label={link.label.trim() || "LinkedIn"}
          >
            <img src="/icons/linkedin.svg" width={47} height={47} alt="" />
            <img className="linkedin-mark" src="/icons/linkedin-mark.svg" width={22} height={25} alt="" />
          </a>
        ))}
      </div>
    ) : null;

  return (
    <footer className="site-footer" id="kontakt">
      <img className="footer-logo" src="/icons/logo-footer.svg" alt="" />
      <div className="footer-brand">
        <address>
          {details.street.trim() ? <span>{details.street.trim()}</span> : null}
          {details.postal.trim() ? <span>{details.postal.trim()}</span> : null}
          {tel ? <a href={tel}>{phone}</a> : null}
          {email ? <a href={`mailto:${email}`}>{email}</a> : null}
        </address>
        {hasDirectory ? null : social}
      </div>
      {hasDirectory ? (
        <nav className="footer-directory" aria-label="Sidkarta">
          {directory.areas.length > 0 ? <p className="footer-directory-title">Våra expertområden</p> : null}
          <div className="footer-directory-row">
            {directory.areas.length > 0 ? (
              <ul className="footer-areas">
                {directory.areas.map((item) => (
                  <li key={item.href}>
                    <a href={item.href}>{item.label}</a>
                  </li>
                ))}
              </ul>
            ) : null}
            {directory.links.length > 0 || social ? (
              <div className="footer-directory-end">
                {directory.links.length > 0 ? (
                  <ul className="footer-menu">
                    {directory.links.map((item) => (
                      <li key={item.href}>
                        <a href={item.href}>{item.label}</a>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {social}
              </div>
            ) : null}
          </div>
        </nav>
      ) : null}
    </footer>
  );
}
