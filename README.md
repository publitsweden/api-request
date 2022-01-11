# Publit Api Request

A typescript library for making requests to Core and similar API:s

[API documentation](https://publitsweden.github.io/api-request/)

# Quick start

## Connect to registry
Create or update the `.npmrc` in the same folder as the `package.json`.file in your project:

```
# Fetch our Publit packages from GitHub registry
@publitsweden:registry=https://npm.pkg.github.com

# Authenticate with GitHub registry
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

There are multiple ways to [authenticate to GitHub](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-to-github-packages) to be able to download packages. With the method in the snippet above, you need a Personal Access Token stored as an environment variable `GITHUB_TOKEN`, but there are other ways as well.

## Install the package

**Note:** you must be authenticated with GitHub to be able to install packages.

```sh
npm install @publitsweden/api-request
```

Import the `PublitApiRequest` export from the package and use according to [the documentation](https://publitsweden.github.io/api-request/):

```ts
import { PublitApiRequest } from '@publitsweden/api-request'

const works = await new PublitApiRequest<Work>('works')
  .where('title', 'LIKE', 'lord of the')
  .with('contributors')
  .index()
```

# Develop

If you want to clone this repo for local development, and use your local copy in a local project, use the following commands:

```sh
cd /path/to/api-request      # Move into the local package folder
npm link                     # Create global link
cd /path/project             # Move into project folder
npm link @publitsweden/api-request # Install package from link
```

The above commands will create a symlink in the global `node_modules` folder, and then use that symlink in your project, making it possible to make changes to your package locally and see them in your project immediately.

[More information on the npm link command](https://docs.npmjs.com/cli/v8/commands/npm-link)

# Test

Run the Jest unit tests with `npm test`

# Publish a new version

When you want to publish a new version, you should first run a build and commit the resulting `/dist` and `/docs` folders:

## Build
```sh
npm run build
git add .
git commit "Creates new build"
git push
```

## Create version
Then create a new version, and push the new code and tag to GitHub:

```sh
npm run publish-major # If you want a new major version, or…
npm run publish-minor # if you want a new minor version
git push --tags
```

## Publish release and package
To publish a new package, we must create a new release in Github. This will trigger a workflow that publishes a new version of the package.
