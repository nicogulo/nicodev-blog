---
title: Implementing Login Feature in Chamjo Design
date: 2024-11-10
excerpt: How Chamjo implemented authentication system with Supabase and the significant transformation of landing page.
---

## Choosing Supabase as Auth Provider

The decision to use **Supabase** as our authentication provider was not made lightly. Supabase offers several advantages that aligned with Chamjo's needs:

1. **Open Source** - Can be self-hosted if needed
2. **Built-in Auth** - No need to build auth system from scratch
3. **Social Login** - Easy integration with Google, GitHub, and other providers
4. **Real-time Database** - Bonus feature that can be leveraged for other features later

The auth implementation uses SSR (Server-Side Rendering) approach for better security. This approach works well with Next.js App Router that Chamjo uses.

## Google Sign-In - A Strategic Choice

Chamjo chose **Google Sign-In** as the primary login method. This decision was based on several considerations:

- **User Experience** - Most users already have a Google account, so they don't need to create a new one
- **Trust** - Google is a well-known and trusted OAuth provider
- **Quick Implementation** - Supabase provides an abstraction that makes Google OAuth integration easier

The login modal was designed with a **mobile-first** approach. For mobile view, we used a Bottom Sheet that's easier to reach with the thumb. For desktop, it's displayed as a Modal dialog that users are familiar with.

## Landing Page Transformation

One of the most significant changes was how the landing page transformed based on user authentication status.

### Before Login (Guest User)

The landing page displays various sections to introduce Chamjo:
- **Hero Section** - Chamjo's main value proposition
- **Content Section** - Platform features explanation
- **Trusted Section** - Social proof from users
- **Benefit Section** - Advantages of using Chamjo
- **Benchmark Section** - Comparison with competitors
- **FAQ Section** - Frequently asked questions
- **CTA Section** - Call to action to encourage registration

### After Login (Authenticated User)

Logged-in users are directly redirected to the `/browse` page containing Chamjo's main content. This provides a seamless experience - users don't need to see the landing page again after becoming registered users.

The `/browse` page itself is well protected. If unauthenticated users try to access it, they will be redirected back to the landing page.

## Timeline

| Date | Milestone |
|---------|-----------|
| May 2024 | Auth configuration and custom hooks implementation |
| May 2024 | ModalLogin component with Google Sign-In |
| November 2024 | First release with stable login feature |
| 2025 | Various improvements and stabilization |

## Lessons Learned

### 1. Authentication as Foundation

Starting with auth from the beginning makes the architecture cleaner. No need to retrofit auth into an already complex system. Every new feature that requires user context is ready from the start.

### 2. SSR for Security

Using Supabase SSR client provides better security because tokens are managed server-side. This prevents potential attacks like token theft from client-side storage.

### 3. UX-First Approach

Responsive login modal shows attention to user experience. Bottom Sheet for mobile and Modal for desktop is the right choice to provide the best experience on each device.

### 4. Proper Redirect Strategy

Directing logged-in users directly to the content page (not landing page) provides a more personalized experience and saves user time.

## Tech Stack for Authentication

- **Frontend Framework**: Next.js with App Router
- **Auth Provider**: Supabase Auth with SSR support
- **OAuth Provider**: Google Sign-In
- **State Management**: React Hooks with custom hooks pattern
- **Routing Protection**: Server-side redirect based on auth state

## Closing

The implementation of login feature in Chamjo shows that with proper planning and the right tech stack choice, a fundamental feature like authentication can be implemented relatively quickly and stably.

The main keys are choosing a mature provider (Supabase), using a secure approach (SSR), and paying attention to user experience on every platform (responsive login modal).

This feature became the foundation that enabled Chamjo to develop other features requiring user authentication later on.

---

*This article was written based on analysis of nicogulo/chamjo-app GitHub repository and the team's experience in developing Chamjo Design.*
