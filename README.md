# Tower

A note-taking app, inspired by ideas in incremental/append-only note-taking.
Mainly written for my own use.

## Goals

- Local-first. Take notes completely offline, with optional sign-in to sync
between devices.
- Clients for each platform, matching my sensibilities.
    - CLI app for desktop use. This makes it easily scriptable and easy to
    integrate with my existing tools (quick capture through a script + binding
    in my window manager, use vim for notes, etc). In this case, sync should be
    done without relying on a GUI, instead using a system service (systemd,
    launchd, etc).
    - Native mobile app. I tend to use mobile as a inbox and quick capture,
    rather than for deep work. The mobile app should be designed for these use
    cases, and integrate with the operating system where possible, allowing for
    quick capture through voice and through sharing.
    - Maybe a web app, which allows accessing notes from a devices without an
    installed client, and perhaps quick capture. In my everyday workflow, I
    would prefer to use a CLI as the main interface, so I am not sure how much I
    want this or how much it will fit in.
- Start with the pieces I'll use day-to-day, and expand from there.
- Sync should be accessible over the public internet with proper auth. This
sounds like overkill for a personal setup, and I'd usually host these types of
applications for myself using my own server through Tailscale. However, I will
use this application at work, and work in a locked-down environment in which I
can't install Tailscale.

## Non-goals

- Sacrificing UX for a specific ideal. Plain text is great, but using plain text
the primary interface for every platform imposes design limitations that trickle
down through the UX.
- Supporting workflows that I won't use.

## Related

- [Incremental note-taking | thesephist.com](https://thesephist.com/posts/inc/)
- [ThatNerdSquared/peregrine](https://github.com/ThatNerdSquared/peregrine)
- [Ideaflow](https://ideaflow.app/)
- [Journelly | Jack Baty](https://baty.net/posts/2025/04/journelly-org-mode-backed-journaling-for-i-os/)
