/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

const GITHUB_GQL_ENDPOINT = 'https://api.github.com/graphql'
const gqlFetch = require('graphql-fetch')(GITHUB_GQL_ENDPOINT)

/* global Headers */

/**
 * GraphQL fetch function.
 *
 * @param {string} query the GraphQL query
 * @param {string} token the Github Personal Access Token (repo scope only is needed)
 */
async function githubFetch (query, token) {
  const headers = new Headers({
    Authorization: `Bearer ${token}`
  })

  return gqlFetch(query, {}, {
    headers,
    method: 'POST'
  })
}

/**
 * Fetch the Github contributors for pages at a path in a repo.
 *
 * @param {string} repoOwner the Github org/owner to query from
 * @param {string} repoName the Github repo to query from
 * @param {string} branch the Github branch to query from
 * @param {string} pagePath the folder path for the pages in the repo to query from
 * @param {string} token the Github Personal Access Token
 */
async function githubFetchContributorsForPage (repoOwner, repoName, branch, pagePath, token) {
  const res = await githubFetch(`
  query {
    repository(owner: "${repoOwner}", name: "${repoName}") {
      object(expression: "${branch}") {
        ... on Commit {
          history(first: 100, path: "${pagePath}") {
            nodes {
              author {
                user {
                  name
                  login
                }
                date
              }
            }
          }
        }
      }
    }
  }
  `, token)

  // the nodes history is from latest history to earliest
  const { nodes } = res.data.repository.object.history
  // flatten the nodes
  const flattenedNodes = nodes.map(node => {
    const { date, user } = node.author
    const { name, login } = user

    return {
      name,
      login,
      date
    }
  })

  // create a Set (thus unique items), by mapping via login
  return Array.from(new Set(flattenedNodes.map(node => node.login)))
    // map it back to the node (the first found will be the latest entry)
    .map(login => flattenedNodes.find(node => node.login === login))
}

module.exports = {
  githubFetch,
  githubFetchContributorsForPage
}
