const { version } = require('../package.json');
export const API =  {
  "openapi": "3.0.0",
  "info": {
    "title": `vlt serverless registry - api documentation`,
    "version": version
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
  "paths": {
    "/-/whoami": {
      "get": {
        "summary": "Retrieve user name",
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
    "/-/npm/v1/user": {
      "get": {
        "summary": "Get user profile",
        "responses": {
          "200": {
            "description": "User profile",
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
        "summary": "Ping the server",
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
    "/-/npm/v1/tokens": {
      "get": {
        "summary": "Get a token profile",
        "responses": {
          "200": {
            "description": "Token profile",
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
        "summary": "Create a new token",
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
        "summary": "Update an existing token",
        "responses": {
          "200": {
            "description": "Token updated"
          }
        }
      },
      "delete": {
        "summary": "Delete a token",
        "responses": {
          "204": {
            "description": "Token deleted"
          }
        }
      }
    },
    "/-/npm/v1/tokens/token/{uuid}": {
      "delete": {
        "summary": "Delete a token by UUID",
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
    "/{scope}/{pkg}/-/{tarball}": {
      "get": {
        "summary": "Get package tarball",
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
            "name": "pkg",
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
    "/{scope}/{pkg}/{version}": {
      "get": {
        "summary": "Get package manifest by version",
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
            "name": "pkg",
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
    "/{scope}/{pkg}": {
      "get": {
        "summary": "Get package packument",
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
            "name": "pkg",
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
        "summary": "Publish a package",
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
            "name": "pkg",
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
