# Taylor Thompson Home Group Website

Static website with a Decap CMS admin area for blog updates.

## Blog Admin

The admin form lives at:

```text
/admin/
```

Blog posts are stored in:

```text
assets/data/blog-posts.json
```

The public blog page reads that JSON file directly, so every saved admin change updates the live blog after Netlify commits it back to GitHub.

## GitHub + Netlify Setup

1. Create a GitHub repository and upload this folder.
2. In Netlify, create a new site from that GitHub repository.
3. Use these deploy settings:
   - Build command: leave blank
   - Publish directory: `.`
4. In Netlify, go to **Identity** and enable Identity.
5. In **Identity > Services**, enable **Git Gateway**.
6. Invite the admin user under **Identity > Invite users**.
7. Open `/admin/` on the live Netlify site and log in.

## Important Admin Notes

- The CMS is configured for the `main` branch.
- Uploaded blog images go to `assets/images/uploads`.
- The newest blog post by publish date becomes the featured post automatically.
- Replace `site_url` and `display_url` in `admin/config.yml` after Netlify gives you the final live URL.
