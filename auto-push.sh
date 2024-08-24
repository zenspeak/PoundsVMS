#!/bin/bash

# Configure Git to use the token
git config --global credential.helper store
echo "https://${GITHUB_TOKEN}:x-oauth-basic@github.com" > ~/.git-credentials

# Add all changes
git add .

# Commit changes
git commit -m "Auto-commit: Accepted changes from Composer"

# Pull latest changes from remote
git pull origin main --rebase

# Push changes to remote
git push origin main