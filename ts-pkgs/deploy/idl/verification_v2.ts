/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/verification_v2.json`.
 */
export type VerificationV2 = {
  "address": "GbFfTqMqKDgAMRH8VmDmoLTdvDd1853TnkkEwpydv3J6",
  "metadata": {
    "name": "verificationV2",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Wormhole threshold signature verification program"
  },
  "instructions": [
    {
      "name": "appendSchnorrKey",
      "discriminator": [
        8,
        6,
        50,
        98,
        26,
        48,
        99,
        30
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "vaa"
        },
        {
          "name": "signatureSet"
        },
        {
          "name": "latestKey",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  97,
                  116,
                  101,
                  115,
                  116,
                  107,
                  101,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "newSchnorrKey",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  99,
                  104,
                  110,
                  111,
                  114,
                  114,
                  107,
                  101,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "vaa"
              }
            ]
          }
        },
        {
          "name": "oldSchnorrKey",
          "writable": true,
          "optional": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "verifyVaa",
      "discriminator": [
        147,
        254,
        88,
        41,
        24,
        223,
        219,
        29
      ],
      "accounts": [
        {
          "name": "schnorrKey"
        }
      ],
      "args": [
        {
          "name": "rawVaa",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "verifyVaaAndDecode",
      "discriminator": [
        234,
        128,
        204,
        252,
        150,
        171,
        153,
        75
      ],
      "accounts": [
        {
          "name": "schnorrKey"
        }
      ],
      "args": [
        {
          "name": "rawVaa",
          "type": "bytes"
        }
      ],
      "returns": "bytes"
    },
    {
      "name": "verifyVaaHeaderWithDigest",
      "discriminator": [
        228,
        60,
        144,
        171,
        140,
        217,
        77,
        189
      ],
      "accounts": [
        {
          "name": "schnorrKey"
        }
      ],
      "args": [
        {
          "name": "rawVaaHeader",
          "type": {
            "array": [
              "u8",
              57
            ]
          }
        },
        {
          "name": "digest",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "latestKeyAccount",
      "discriminator": [
        26,
        81,
        106,
        22,
        26,
        185,
        50,
        132
      ]
    },
    {
      "name": "schnorrKeyAccount",
      "discriminator": [
        239,
        35,
        12,
        8,
        168,
        74,
        77,
        153
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidSignature",
      "msg": "Signature does not satisfy preconditions"
    },
    {
      "code": 6001,
      "name": "signatureVerificationFailed"
    }
  ],
  "types": [
    {
      "name": "latestKeyAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "account",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "schnorrKey",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "key",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "schnorrKeyAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "index",
            "type": "u32"
          },
          {
            "name": "schnorrKey",
            "type": {
              "defined": {
                "name": "schnorrKey"
              }
            }
          },
          {
            "name": "expirationTimestamp",
            "type": "u64"
          }
        ]
      }
    }
  ]
};


export const idl: VerificationV2 = {
  "address": "GbFfTqMqKDgAMRH8VmDmoLTdvDd1853TnkkEwpydv3J6",
  "metadata": {
    "name": "verificationV2",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Wormhole threshold signature verification program"
  },
  "instructions": [
    {
      "name": "appendSchnorrKey",
      "discriminator": [
        8,
        6,
        50,
        98,
        26,
        48,
        99,
        30
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "vaa"
        },
        {
          "name": "signatureSet"
        },
        {
          "name": "latestKey",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  97,
                  116,
                  101,
                  115,
                  116,
                  107,
                  101,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "newSchnorrKey",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  99,
                  104,
                  110,
                  111,
                  114,
                  114,
                  107,
                  101,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "vaa"
              }
            ]
          }
        },
        {
          "name": "oldSchnorrKey",
          "writable": true,
          "optional": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "verifyVaa",
      "discriminator": [
        147,
        254,
        88,
        41,
        24,
        223,
        219,
        29
      ],
      "accounts": [
        {
          "name": "schnorrKey"
        }
      ],
      "args": [
        {
          "name": "rawVaa",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "verifyVaaAndDecode",
      "discriminator": [
        234,
        128,
        204,
        252,
        150,
        171,
        153,
        75
      ],
      "accounts": [
        {
          "name": "schnorrKey"
        }
      ],
      "args": [
        {
          "name": "rawVaa",
          "type": "bytes"
        }
      ],
      "returns": "bytes"
    },
    {
      "name": "verifyVaaHeaderWithDigest",
      "discriminator": [
        228,
        60,
        144,
        171,
        140,
        217,
        77,
        189
      ],
      "accounts": [
        {
          "name": "schnorrKey"
        }
      ],
      "args": [
        {
          "name": "rawVaaHeader",
          "type": {
            "array": [
              "u8",
              57
            ]
          }
        },
        {
          "name": "digest",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "latestKeyAccount",
      "discriminator": [
        26,
        81,
        106,
        22,
        26,
        185,
        50,
        132
      ]
    },
    {
      "name": "schnorrKeyAccount",
      "discriminator": [
        239,
        35,
        12,
        8,
        168,
        74,
        77,
        153
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidSignature",
      "msg": "Signature does not satisfy preconditions"
    },
    {
      "code": 6001,
      "name": "signatureVerificationFailed"
    }
  ],
  "types": [
    {
      "name": "latestKeyAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "account",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "schnorrKey",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "key",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "schnorrKeyAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "index",
            "type": "u32"
          },
          {
            "name": "schnorrKey",
            "type": {
              "defined": {
                "name": "schnorrKey"
              }
            }
          },
          {
            "name": "expirationTimestamp",
            "type": "u64"
          }
        ]
      }
    }
  ]
};