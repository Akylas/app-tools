---
name: nativescript-svelte
description: Stack conventions for svelte-native / NativeScript apps — svelte version constraints and which idioms are unavailable, reactivity and perf traps, platform splits, build-time flags, and native-object lifetimes. Use when writing or reviewing .svelte / .ts code in a NativeScript app.
---

Conventions for the **stack**, not for any one app. Nothing here encodes a directory layout — derive
that per repo (see `understand-project`).

## First: pin the versions, do not assume them

svelte-native pins the svelte major it supports. Writing for the wrong one produces code that will not
compile, and the failure mode is confusing. Check before writing:

```sh
node -p "require('svelte/package.json').version"
node -p "require('@nativescript-community/svelte-native/package.json').peerDependencies"
node -p "require('@nativescript/core/package.json').version" 2>/dev/null
```

**If svelte is 4.x, runes do not exist.** No `$state`, `$derived`, `$effect`, `$props`, `$bindable`,
no snippets/`{#snippet}`, no `onclick`-style event attributes. Use `export let`, `$:`, `on:` directives,
slots, and stores. Do not "modernize" toward svelte 5 syntax — svelte-native will not accept it until
its own peer dep moves.

Writing svelte 4 that is *cheap to migrate later* is still worth it, and costs nothing:

- Prefer **derived stores** over chains of `$:` statements that write to each other.
- Keep `$:` **pure**. A reactive block that performs side effects (creating native objects, firing
  network calls) and also writes back to its own dependency is the classic infinite-loop shape — it is
  the thing `svelte/infinite-reactive-loop` warns about, and suppressing that warning is a smell. Use an
  explicit store subscription with teardown instead.
- Avoid `$$restProps` in hot components; it invalidates every attribute when any prop changes.
- Avoid `<svelte:options accessors />` where a plain prop or an exported function would do.

## Reactivity and rendering cost

NativeScript renders **real native views** — there is no virtual DOM to absorb sloppy invalidation, so
a wasted update is a real layout/draw pass.

- **Rebuilding an array of config objects in a `$:` block re-renders whatever consumes it**, because the
  array identity changes even when nothing meaningful did. If a consumer reacts to identity by
  invalidating a canvas or relayouting a list, every unrelated dependency tick pays for a full redraw.
  Build such lists from `derived` stores keyed on what actually matters.
- The narrow-subscription idiom `let { colorX } = $store; $: ({ colorX } = $store);` exists to avoid
  re-running everything when one field of a big store object changes. Keep it where you find it.
- Prefer `visibility="collapse"` over conditional blocks for things that toggle frequently — remounting
  a native view is far more expensive than hiding it. Conversely, use `{#if}` for genuinely rare or
  heavy subtrees so they are never constructed.
- Lazy-load heavy screens with `await import(...)` and `<svelte:component>`; a static import puts the
  whole subtree on the startup path.

## Build-time flags

Apps in this family inject compile-time constants via webpack `DefinePlugin` (`PRODUCTION`, `DEV_LOG`,
`__ANDROID__`, `__IOS__`, feature flags, …). They are **literals at build time**, so `if (__ANDROID__)`
is dead-code-eliminated rather than branched.

- Read the real list from the webpack config and the ambient declarations (`typings/*.d.ts`) — do not
  guess a flag name.
- **Always gate logging behind the debug flag** (`DEV_LOG && console.log(...)`). Ungated logs ship, cost
  string formatting on every call, and leak internals.
- Never put a flag check behind a runtime indirection that defeats elimination.

## Platform splits

Platform-specific code goes in `.android.ts` / `.ios.ts` next to a shared `.common.ts`, resolved by the
bundler, with a `.d.ts` declaring the shared surface. Prefer this over `if (__ANDROID__)` when the whole
implementation differs; prefer the inline flag for a couple of lines.

When touching one platform, check whether the sibling needs the same change — a split file is exactly
where the two silently drift.

## Native objects have lifetimes

Views, layers, datasources, decoders, bitmaps and listeners are backed by native objects.

- Anything registered in `onMount` (application events, service listeners, native callbacks) must be
  unregistered in `onDestroy`. A missed `off()` keeps the whole component graph alive.
- Watch for **symmetry bugs**: `on(...)` in mount paired with `on(...)` again in destroy instead of
  `off(...)` is a common and near-invisible typo. Read both halves together.
- Replacing a native object usually means disposing the old one explicitly; garbage collection on the JS
  side does not free the native peer promptly.
- Objects captured by a closure that outlives the view (a translation function driven by a gesture, a
  native listener) keep operating after the view is gone — reset or detach them on teardown.

## Types

- These apps typically depend on **forks** of the NativeScript packages (scoped differently from
  upstream). Prefer the typings in `node_modules/` over published docs, which describe upstream.
- Hand-assembled context/singleton objects are frequently built with `as any`, which switches off all
  checking of whether the object matches its declared interface. Treat such an interface as
  **documentation, not a guarantee**: verify against the implementation, and when you correct one of
  these types expect the newly honest type to surface real errors elsewhere.
- Prefer narrowing (`instanceof`, type guards) over `as` casts when reaching for a subclass member.

## Review checklist

- [ ] No runes / svelte-5-only syntax when the project is on svelte 4
- [ ] No side-effecting `$:` block that writes back to its own dependency
- [ ] Every `console.log` gated behind the debug flag
- [ ] Every `on(...)`/listener registration has a matching removal on destroy
- [ ] Platform siblings (`.android` / `.ios`) kept in step
- [ ] No new `as any` on a shared interface; narrow instead
- [ ] Frequently toggled views use `visibility`, heavy rare ones use `{#if}` + lazy import
