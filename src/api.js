const npm = {
  "url": "https://registry.npmjs.org",
  "description": "npm public registry"
}
const year = new Date().getFullYear()

export const API = {
  "openapi": "3.1.0",
  "servers": [{
    "url": DMNO_CONFIG.REGISTRY_URL,
    "description": DMNO_CONFIG.REGISTRY_INSTANCE_DESCRIPTION,
  }],
  "info": {
    "title": `vlt serverless registry`,
    "version": DMNO_CONFIG.VSR_VERSION,
    "license": {
      "identifier": "FSL-1.1-MIT",
      "name": "Functional Source License, Version 1.1, MIT Future License",
      "url": "https://fsl.software/FSL-1.1-MIT.template.md"
    },
    "description": `
  The **vlt serverless registry** is a npm compatible JavaScript package registry which replicates core features & functionality of **\`registry.npmjs.org\`** while also introducing net-new capabilities.

  ### Compatible Clients

  <table>
    <tbody>
      <tr>
        <td><a href="https://vlt.sh" alt="vlt"><strong><code>vlt</code></strong></a></td>
        <td><a href="https://npmjs.com/package/npm" alt="npm"><strong><code>npm</code></strong></a></td>
        <td><a href="https://yarnpkg.com/" alt="yarn"><strong><code>yarn</code></strong></a></td>
        <td><a href="https://pnpm.io/" alt="pnpm"><strong><code>pnpm</code></strong></a></td>
        <td><a href="https://deno.com/" alt="deno"><strong><code>deno</code></strong></a></td>
        <td><a href="https://bun.sh/" alt="bun"><strong><code>bun</code></strong></a></td>
      </tr>
    </tbody>
  </table>

  ### Resources

  <ul alt="resources">
    <li><a href="https://vlt.sh">https://<strong>vlt.sh</strong></a></li>
    <li><a href="https://github.com/vltpkg/vsr">https://github.com/<strong>vltpkg/vsr</strong></a></li>
    <li><a href="https://discord.gg/vltpkg">https://discord.gg/<strong>vltpkg</strong></a></li>
    <li><a href="https://x.com/vltpkg">https://x.com/<strong>vltpkg</strong></a></li>
  </ul>

  ##### Trademark Disclaimer

  <p alt="trademark-disclaimer">All trademarks, logos and brand names are the property of their respective owners. All company, product and service names used in this website are for identification purposes only. Use of these names, trademarks and brands does not imply endorsement.</p>

  ### License

<details alt="license">
  <summary><strong>Functional Source License</strong>, Version 1.1, MIT Future License</summary>
<h1>Functional Source License,<br />Version 1.1,<br />MIT Future License</h1>
<h2>Abbreviation</h2>

FSL-1.1-MIT

<h2>Notice</h2>

Copyright ${year} vlt technology inc.

<h2>Terms and Conditions</h2>

<h3>Licensor ("We")</h3>

The party offering the Software under these Terms and Conditions.

<h3>The Software</h3>

The "Software" is each version of the software that we make available under
these Terms and Conditions, as indicated by our inclusion of these Terms and
Conditions with the Software.

<h3>License Grant</h3>

Subject to your compliance with this License Grant and the Patents,
Redistribution and Trademark clauses below, we hereby grant you the right to
use, copy, modify, create derivative works, publicly perform, publicly display
and redistribute the Software for any Permitted Purpose identified below.

<h3>Permitted Purpose</h3>

A Permitted Purpose is any purpose other than a Competing Use. A Competing Use
means making the Software available to others in a commercial product or
service that:

1. substitutes for the Software;

2. substitutes for any other product or service we offer using the Software
  that exists as of the date we make the Software available; or

3. offers the same or substantially similar functionality as the Software.

Permitted Purposes specifically include using the Software:

1. for your internal use and access;

2. for non-commercial education;

3. for non-commercial research; and

4. in connection with professional services that you provide to a licensee
  using the Software in accordance with these Terms and Conditions.

<h3>Patents</h3>

To the extent your use for a Permitted Purpose would necessarily infringe our
patents, the license grant above includes a license under our patents. If you
make a claim against any party that the Software infringes or contributes to
the infringement of any patent, then your patent license to the Software ends
immediately.

<h3>Redistribution</h3>

The Terms and Conditions apply to all copies, modifications and derivatives of
the Software.

If you redistribute any copies, modifications or derivatives of the Software,
you must include a copy of or a link to these Terms and Conditions and not
remove any copyright notices provided in or with the Software.

<h3>Disclaimer</h3>

THE SOFTWARE IS PROVIDED "AS IS" AND WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING WITHOUT LIMITATION WARRANTIES OF FITNESS FOR A PARTICULAR
PURPOSE, MERCHANTABILITY, TITLE OR NON-INFRINGEMENT.

IN NO EVENT WILL WE HAVE ANY LIABILITY TO YOU ARISING OUT OF OR RELATED TO THE
SOFTWARE, INCLUDING INDIRECT, SPECIAL, INCIDENTAL OR CONSEQUENTIAL DAMAGES,
EVEN IF WE HAVE BEEN INFORMED OF THEIR POSSIBILITY IN ADVANCE.

<h3>Trademarks</h3>

Except for displaying the License Details and identifying us as the origin of
the Software, you have no right under these Terms and Conditions to use our
trademarks, trade names, service marks or product names.

<h2>Grant of Future License</h2>

We hereby irrevocably grant you an additional license to use the Software under
the MIT license that is effective on the second anniversary of the date we make
the Software available. On or after that date, you may use the Software under
the MIT license, in which case the following will apply:

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
</dialog>
  `
  },
  "components": {
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "Bearer <token>",
      }
    }
  },
  "security": [
    {
      "bearerAuth": []
    }
  ],
  "tags": [
    {
      "name": "Users",
      "description": "Some endpoints are public, but some require authentication. We provide all the required endpoints to create an account and authorize yourself."
    },
    {
      "name": "Tokens",
      "description": ""
    },
    {
      "name": "Packages",
      "description": ""
    },
    {
      "name": "Misc.",
      "description": ""
    },
  ],
  "paths": {
    "/-/npm/v1/user": {
      "get": {
        "tags": ["Users"],
        "summary": "Get User Profile",
        "description": `Returns profile object associated with auth token
\`\`\`bash
$ npm profile
name: johnsmith
created: 2015-02-26T01:26:01.124Z
updated: 2023-01-10T21:55:32.118Z
\`\`\``,
        "responses": {
          "200": {
            "description": "User Profile",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "example": {
                    "name": "johnsmith"
                  }
                }
              }
            }
          }
        }
      }
    },
    "/-/ping": {
      "get": {
        "tags": ["Misc."],
        "summary": "Ping",
        "description": `Check if the server is alive
\`\`\`bash
$ npm ping
npm notice PING http://localhost:1337/
npm notice PONG 13ms
\`\`\``,
        "security": [],
        "responses": {
          "200": {
            "description": "Server is alive",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "example": {}
                }
              }
            }
          }
        }
      }
    },

    "/": {
      "get": {
        "tags": ["Misc."],
        "summary": "Documentation",
        "description": "Get the registry docs",
        "responses": {
          "200": {
            "description": "Retrieves the registry docs",
          }
        }
      }
    },
    "/-/whoami": {
      "get": {
        "tags": ["Users"],
        "summary": "Get User Username",
        "description": `Returns username associated with auth token
\`\`\`bash
$ npm whoami
johnsmith
\`\`\``,
        "responses": {
          "200": {
            "description": "Retrieves a user name",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "example": {
                    "username": "johnsmith"
                  }
                }
              }
            }
          }
        }
      }
    },
    "/-/npm/v1/tokens": {
      "get": {
        "tags": ["Tokens"],
        "summary": "Get Token Profile",
        "description": `Get tokens for the associative authenticated user

\`\`\`bash
$ npm token list
<token-type> token <partial-token>… with id <uuid> created <date-created>
\`\`\``,
        "responses": {
          "200": {
            "description": "Token Profile",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "example": {
                    "objects": [
                      {
                        "cidr_whitelist": null,
                        "readonly": false,
                        "automation": null,
                        "created": null,
                        "updated": null,
                        "scope": [
                          {
                            "values": [
                              "*"
                            ],
                            "types": {
                              "pkg": {
                                "read": true,
                                "write": true
                              }
                            }
                          },
                          {
                            "values": [
                              "*"
                            ],
                            "types": {
                              "user": {
                                "read": true,
                                "write": true
                              }
                            }
                          }
                        ],
                        "key": "fff00131-d831-4517-84c0-1b53b1c85ba9",
                        "token": "a67a46ad-fe51-4fde-94fe-c56ee00fd638"
                      }
                    ],
                    "urls": {}
                  }
                }
              }
            }
          }
        }
      },
      "post": {
        "tags": ["Tokens"],
        "summary": "Create Token",
        "description": "Creates a token for authenticated user or provided UUID user (later requires global read+write user scope)",
        "headers": {
          "Authorization": {
            "description": "The number of allowed requests in the current period",
            "schema": {
              "type": "Authorization",
              "bearerFormat": "Bearer <token>"
            }
          }
        },
        "requestBody": {
          "description": "Scope of access/scopes for the new token",
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "example": {
                  "uuid": "admin",
                  "scope": [
                    {
                      "values": ["*"],
                      "types": { "pkg": { "read": true, "write": false }}
                    },
                    {
                      "values": [
                        "~admin"
                      ],
                      "types": {
                        "user": {
                          "read": true,
                          "write": true
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Token created",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "example": {
                    "uuid": "admin",
                    "token": "1ef5f713-15ff-6491-b62d-d16f6f04e6ac",
                    "scope": [
                      {
                        "values": [
                          "*"
                        ],
                        "types": {
                          "pkg": {
                            "read": true,
                            "write": false
                          }
                        }
                      },
                      {
                        "values": [
                          "~admin"
                        ],
                        "types": {
                          "user": {
                            "read": true,
                            "write": true
                          }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      },
      "put": {
        "tags": ["Tokens"],
        "summary": "Update Token",
        "description": "Update a token by the token itself",
        "responses": {
          "200": {
            "description": "Token updated"
          }
        }
      },
      "delete": {
        "tags": ["Tokens"],
        "summary": "Delete Token by Auth",
        "description": `Revokes a token for the associative authenticated user

\`\`\`bash
$ npm token revoke <token>
\`\`\``,
        "responses": {
          "204": {
            "description": "Token Deleted Response"
          }
        }
      }
    },
    "/-/npm/v1/tokens/token/{uuid}": {
      "delete": {
        "tags": ["Tokens"],
        "summary": "Delete Token by UUID",
        "description": "Delete a token by the token UUID",
        "parameters": [
          {
            "in": "path",
            "name": "uuid",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "204": {
            "description": "Token deleted"
          }
        }
      }
    },
    "/{package-name}": {
      "get": {
        "tags": ["Packages"],
        "summary": "Get Package Packument",
        "description": "Returns all published packages & metadata for the specific package name",
        "parameters": [
          {
            "in": "path",
            "name": "scope",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "in": "path",
            "name": "package-name",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Package packument"
          },
          "404": {
            "description": "Not found"
          }
        }
      },
      "put": {
        "tags": ["Packages"],
        "summary": "Publish Package",
        "parameters": [
          {
            "in": "path",
            "name": "scope",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "in": "path",
            "name": "package-name",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "description": "Package data",
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Package published"
          },
          "400": {
            "description": "Invalid request"
          },
          "409": {
            "description": "Conflict"
          }
        }
      }
    },
    "/{package-name}/{version}": {
      "get": {
        "tags": ["Packages"],
        "summary": "Get Package Manifest",
        "description": "Returns the full package manifest for a specific package version",
        "parameters": [
          {
            "in": "path",
            "name": "scope",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "in": "path",
            "name": "package-name",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "in": "path",
            "name": "version",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Package manifest"
          },
          "404": {
            "description": "Not found"
          }
        }
      }
    },
    "/{package-name}/-/{tarball}": {
      "get": {
        "tags": ["Packages"],
        "summary": "Get Package Tarball",
        "parameters": [
          {
            "in": "path",
            "name": "scope",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "in": "path",
            "name": "package-name",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "in": "path",
            "name": "tarball",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Package tarball"
          },
          "404": {
            "description": "Not found"
          }
        }
      }
    }
  },
  "securitySchemes": {
    "bearerAuth": {
      "type": "http",
      "scheme": "bearer"
    },
    "basicAuth": {
      "type": "http",
      "scheme": "basic"
    },
    "apiKeyHeader": {
      "type": "apiKey",
      "in": "header",
      "name": "X-API-Key"
    },
    "apiKeyQuery": {
      "type": "apiKey",
      "in": "query",
      "name": "api_key"
    },
    "apiKeyCookie": {
      "type": "apiKey",
      "in": "cookie",
      "name": "api_key"
    },
    "oAuth2": {
      "type": "oauth2",
      "flows": {
        "authorizationCode": {
          "authorizationUrl": "https://galaxy.scalar.com/oauth/authorize",
          "tokenUrl": "https://galaxy.scalar.com/oauth/token",
          "scopes": {
            "read:account": "read your account information",
            "write:planets": "modify planets in your account",
            "read:planets": "read your planets"
          }
        },
        "clientCredentials": {
          "tokenUrl": "https://galaxy.scalar.com/oauth/token",
          "scopes": {
            "read:account": "read your account information",
            "write:planets": "modify planets in your account",
            "read:planets": "read your planets"
          }
        },
        "implicit": {
          "authorizationUrl": "https://galaxy.scalar.com/oauth/authorize",
          "scopes": {
            "read:account": "read your account information",
            "write:planets": "modify planets in your account",
            "read:planets": "read your planets"
          }
        },
        "password": {
          "tokenUrl": "https://galaxy.scalar.com/oauth/token",
          "scopes": {
            "read:account": "read your account information",
            "write:planets": "modify planets in your account",
            "read:planets": "read your planets"
          }
        }
      }
    }
  },
  "parameters": {
    "planetId": {
      "name": "planetId",
      "in": "path",
      "required": true,
      "schema": {
        "type": "integer",
        "format": "int64",
        "examples": [
          1
        ]
      }
    },
    "limit": {
      "name": "limit",
      "in": "query",
      "description": "The number of items to return",
      "required": false,
      "schema": {
        "type": "integer",
        "format": "int64",
        "default": 10
      }
    },
    "offset": {
      "name": "offset",
      "in": "query",
      "description": "The number of items to skip before starting to collect the result set",
      "required": false,
      "schema": {
        "type": "integer",
        "format": "int64",
        "default": 0
      }
    }
  },
  "responses": {
    "BadRequest": {
      "description": "Bad Request",
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/Error"
          }
        }
      }
    },
    "Forbidden": {
      "description": "Forbidden",
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/Error"
          }
        }
      }
    },
    "NotFound": {
      "description": "NotFound",
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/Error"
          }
        }
      }
    },
    "Unauthorized": {
      "description": "Unauthorized",
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/Error"
          }
        }
      }
    }
  }
}
