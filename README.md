# Bio 40C Companion — public website

Unofficial student-built Human Anatomy & Physiology III study companion. Not affiliated with or endorsed by Foothill College or the instructor. Confirm dates, topics and grading policies in class/Canvas.

Includes course guides, source-referenced practice, optional lecture preparation, personal grade planning, instructor clarification notes, larger tablet text and System/Light/Dark appearance.

The responsive interface provides visible small-screen navigation, larger touch targets, keyboard skip-to-content and expandable optional activities. On phones, Privacy & storage is available below the page footer so it does not cover forms.

Lecture prep also offers optional recall with cited feedback, confidence/self-checks, prediction/reflection, teach-back and earlier-concept review. Activities start hidden, are ungraded, require no recording and can be skipped. Saved responses remain in local course data and backups. Choose lecture topics yourself; earlier reviews use those choices rather than assuming the instructor's order.

## Privacy

The creator does not track visitors' study activity and cannot view their saved coursework through this website. There are no activity reports or creator dashboard. The privacy notice leads with device-local storage and explicitly includes both classmates and the creator; technical hosting/storage details are expandable. Exporting or sharing a backup is a user-controlled action.

Study data stays in localStorage in the visitor's browser profile. Classmates opening the website on their own devices cannot see your saved work; there is no shared class database. No accounts, automatic cloud sync, analytics or data submission endpoints. Use Settings & backup to export/restore a private JSON backup. Clearing browser site data can erase progress; private browsing may discard it when closed. Someone using your device with your browser profile may see your work. Code from other pages under producer456.github.io visited in that same browser profile may access its storage; this does not give visitors on other devices access. Local storage is not encrypted by the application. Backup files are private user data, not contributions to this repository.

The first-visit notice can always be reopened using Privacy & storage. GitHub Pages receives website requests and logs IP addresses for security; see [GitHub Pages documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages). Fonts use the device's installed fonts; there are no external font requests.

## Content and sources

This repository contains reviewed static website files and 24 supplied original class documents (23 PDFs and one DOCX), shared for noncommercial study under instructor permission reported by the project owner. Materials must not be sold. See [sharing terms and provenance](SHARING.md) and [file manifest](sources/manifest.json). Original authors and notices are preserved, including documents crediting Jeff Schinske. Native source/history, private recordings, transcripts, credentials and saved student coursework remain excluded. Practice questions are study aids, not official exam questions. The bank includes lecture, lab and textbook references; it is not entirely slide-derived. Lecture topic assignment is manual, and numbering follows regular scheduled slots rather than confirmed instructor numbering or holiday exclusions.

The six textbook page images are from OpenStax Anatomy & Physiology 2e, licensed CC BY-NC-SA 4.0. Access for free at openstax.org. See [figure attribution](figures/attribution.json) for source, page numbers, license and modifications. No blanket license over instructor materials is granted.

## Hosting and updates

GitHub Pages serves the main branch root. `.nojekyll` disables Jekyll processing. All asset URLs are relative, so project-path hosting works. Updates are built from an explicit public-file allowlist in the private working project's `tools/export-public-site.mjs`; never copy the whole private repository here.

For local preview: `python3 -m http.server 8000` in this folder, then open http://localhost:8000. No build dependencies.
# Lecture-first study sessions

Course library groups 10 lecture-slide sessions and 13 lab/recap sessions by topic, with 52 optional source-specific checkpoints. Read the cited original page, try a prediction or explanation, reveal companion-written feedback and mark anything to revisit. Eight original slide pages are also rendered inline without changing their content; `study-pages/manifest.json` records their source pages and original hashes.

These are selected guided checkpoints, not a question for every slide, an official answer key or confirmed exam coverage. Free-text work is self-assessed, not automatically graded. The older 60-question bank remains separately labeled mixed-source practice. An optional personal class date does not establish the instructor's lecture order. New responses stay in local course storage and course backups; no progress reset is required.
