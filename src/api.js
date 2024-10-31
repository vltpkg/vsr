const { version } = require('../package.json');
module.exports.API = {
  "openapi": "3.1.0",
  "info": {
    "title": `vlt serverless registry`,
    "version": version,
    "description": `
  The **vlt serverless registry** is a _"npm compatible"_ JavaScript package registry which replicates core features & functionality of **\`registry.npmjs.org\`** while also introducing net-new capabilities.

  ## Compatible Clients

  <table>
    <tbody>
      <tr>
        <td><a href="https://vlt.sh" title="vlt"><strong><code>vlt</code></strong></a></td>
        <td><a href="https://npmjs.com/package/npm" title="npm"><strong><code>npm</code></strong></a></td>
        <td><a href="https://yarnpkg.com/" title="yarn"><strong><code>yarn</code></strong></a></td>
        <td><a href="https://pnpm.io/" title="pnpm"><strong><code>pnpm</code></strong></a></td>
        <td><a href="https://deno.com/" title="deno"><strong><code>deno</code></strong></a></td>
        <td><a href="https://bun.sh/" title="bun"><strong><code>bun</code></strong></a></td>
      </tr>
    </tbody>
  </table>

  ## Resources

  * https://vlt.sh
  * https://github.com/vltpkg/vsr
  `
  },
  "components": {
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "Bearer <token>"
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
        "description": "Get the user profile",
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
        "description": "Check if the server is alive",
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
    "/-/docs": {
      "$ref": "#/paths/~1"
    },
    "/-/whoami": {
      "get": {
        "tags": ["Users"],
        "summary": "Get User Username",
        "description": "Get a user's username",
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
        "summary": "Get a Token Profile",
        "description": "Get a token profile",
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
                              "@gsap/*"
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
        "summary": "Create a Token",
        "description": "Create a new token",
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
                  "scope": [
                    {
                      "values": ["@gsap/premium"],
                      "types": { "pkg": { "read": true, "write": false }}
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
                    "uuid": "1ef5f713-15ff-6490-bfbb-f6bb76ecf4c9",
                    "token": "1ef5f713-15ff-6491-b62d-d16f6f04e6ac",
                    "scope": [
                      {
                        "values": [
                          "@gsap/premium"
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
                          "~johnsmith"
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
        "summary": "Update a Token",
        "description": "Update a token by the token itself",
        "responses": {
          "200": {
            "description": "Token updated"
          }
        }
      },
      "delete": {
        "tags": ["Tokens"],
        "summary": "Delete a Token by Auth",
        "description": "Delete a token by the token itself",
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
        "summary": "Delete a Token by UUID",
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
    },
    "/{package-name}/{version}": {
      "get": {
        "tags": ["Packages"],
        "summary": "Get Package Manifest",
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
    "/{package-name}": {
      "get": {
        "tags": ["Packages"],
        "summary": "Get Package Packument",
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
    }
  }
}
