# Quick Setup & Deployment Guide

This guide is for developers who want to fork this repository and host their own instance of the Tools Dashboard using GitHub Pages.

Because the React application and GitHub Actions workflow are already pre-configured, deploying your own instance only takes a few clicks. No local installation is required unless you want to modify the source code.

## 1. Fork the Repository

Click the **Fork** button in the top-right corner of this repository to copy it to your own GitHub account.
Leave **Copy the `main` branch only** checked.

## 2. Enable GitHub Actions

By default, GitHub disables automated workflows on forked repositories for security reasons. You must enable them so your dashboard can build itself.

1. Go to the **Actions** tab in your forked repository.
2. Click the green **I understand my workflows, go ahead and enable them** button.
3. Go to **Settings → Actions → General**.
4. Scroll down to **Workflow permissions**.
5. Select **Read and write permissions**.
6. Click **Save**.

## 3. Trigger the First Deployment

The dashboard serves from a branch called `gh-pages`, which does not exist yet. Run the workflow once to create it.

1. Go to the **Actions** tab.
2. Click **Deploy to GitHub Pages** in the left sidebar.
3. Click the **Run workflow** dropdown on the right side.
4. Leave the branch as `main` and click the green **Run workflow** button.

Wait about 2 minutes for the build to finish (a green checkmark will appear).

## 4. Configure GitHub Pages

Now that the build is complete, tell GitHub to serve your site.

1. Go to **Settings → Pages** in your repository.
2. Under **Build and deployment**, ensure the **Source** is set to **Deploy from a branch**.
3. Under **Branch**, select `gh-pages` from the dropdown.
4. Leave the folder as `/ (root)`.
5. Click **Save**.

Your dashboard will be live at `https://<your-username>.github.io/web-tools/` within a minute or two.

## 5. Configure the Dashboard UI

To publish, edit, or delete tools directly from your new live dashboard:

1. Visit your live dashboard URL.
2. Click the **Settings** button in the top navigation bar.
3. Update the **Owner** (your GitHub username) and **Repo Name** to match your fork.
4. Click **Save**.

When you click **Publish Tool**, you will need to provide a GitHub Personal Access Token (PAT) with `repo` scopes to authenticate your session.

## Local Development (Optional)

If you want to modify the React UI or Tailwind styling, run the dashboard locally:

```bash
# Clone your fork
git clone https://github.com/<your-username>/web-tools.git
cd web-tools

# Install dependencies
npm install

# Start the local Vite development server
npm run dev
```
