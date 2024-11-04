/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/order_book_dex.json`.
 */
export type OrderBookDex = {
  "address": "4z84hS8fsVpBgZvNwPtH82uUrjuoGP5GkRrTKkAaFDc9",
  "metadata": {
    "name": "orderBookDex",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "cancelOrderPosition",
      "discriminator": [
        102,
        12,
        70,
        112,
        234,
        101,
        27,
        124
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "orderBookConfig"
        },
        {
          "name": "marketPointerRead",
          "optional": true
        },
        {
          "name": "marketPointerWrite",
          "writable": true,
          "optional": true
        },
        {
          "name": "orderPosition",
          "writable": true
        },
        {
          "name": "orderPositionConfig",
          "writable": true
        },
        {
          "name": "prevOrderPosition",
          "writable": true,
          "optional": true
        },
        {
          "name": "nextOrderPosition",
          "writable": true,
          "optional": true
        }
      ],
      "args": []
    },
    {
      "name": "closeOrderPosition",
      "discriminator": [
        231,
        120,
        43,
        118,
        219,
        136,
        196,
        213
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "owner",
          "writable": true
        },
        {
          "name": "orderBookConfig"
        },
        {
          "name": "orderPosition",
          "writable": true
        },
        {
          "name": "orderPositionConfig",
          "writable": true
        },
        {
          "name": "source",
          "writable": true
        },
        {
          "name": "dest",
          "writable": true
        },
        {
          "name": "capitalSource",
          "docs": [
            "CHECKED: Don't need the data, only pubkey"
          ],
          "writable": true
        },
        {
          "name": "capitalDest",
          "docs": [
            "CHECKED: Don't need the data, only pubkey"
          ],
          "writable": true
        },
        {
          "name": "tokenMintSource"
        },
        {
          "name": "tokenMintDest"
        },
        {
          "name": "sourceProgram",
          "docs": [
            "CHECKED: validate owner of token mint source"
          ]
        },
        {
          "name": "destProgram",
          "docs": [
            "CHECKED: validate owner of token mint source"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "createMarketOrder",
      "discriminator": [
        55,
        79,
        206,
        81,
        231,
        152,
        195,
        125
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "orderBookConfig"
        },
        {
          "name": "marketPointer",
          "writable": true
        },
        {
          "name": "orderPosition"
        },
        {
          "name": "source",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "orderBookConfig"
              },
              {
                "kind": "account",
                "path": "tokenMintSource"
              },
              {
                "kind": "account",
                "path": "signer"
              },
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  45,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "dest",
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "orderBookConfig"
              },
              {
                "kind": "account",
                "path": "tokenMintDest"
              },
              {
                "kind": "account",
                "path": "signer"
              },
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  45,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "capitalSource",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "signer"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "tokenMintSource"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "capitalDest",
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "signer"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "tokenMintDest"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenMintSource"
        },
        {
          "name": "tokenMintDest",
          "docs": [
            "CHECKED: validate mint pubkey agaist order book config and market pointer order type"
          ]
        },
        {
          "name": "sourceProgram",
          "docs": [
            "CHECKED: validate owner of token mint source"
          ]
        },
        {
          "name": "nextPositionPointer",
          "optional": true
        }
      ],
      "args": [
        {
          "name": "orderType",
          "type": {
            "defined": {
              "name": "order"
            }
          }
        },
        {
          "name": "fill",
          "type": {
            "defined": {
              "name": "fill"
            }
          }
        },
        {
          "name": "targetAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "createOrderPosition",
      "discriminator": [
        233,
        99,
        216,
        251,
        189,
        20,
        39,
        171
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "orderBookConfig"
        },
        {
          "name": "orderPositionConfig",
          "writable": true
        },
        {
          "name": "orderPosition",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "order_position_config.nonce",
                "account": "orderPositionConfig"
              },
              {
                "kind": "account",
                "path": "signer"
              },
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  100,
                  101,
                  114,
                  45,
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              }
            ]
          }
        },
        {
          "name": "tokenMintA"
        },
        {
          "name": "tokenMintB"
        },
        {
          "name": "capitalSource",
          "writable": true
        },
        {
          "name": "source",
          "writable": true
        },
        {
          "name": "destination"
        },
        {
          "name": "tokenProgramA"
        },
        {
          "name": "tokenProgramB"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "orderType",
          "type": {
            "defined": {
              "name": "order"
            }
          }
        },
        {
          "name": "price",
          "type": "u64"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "createOrderPositionConfig",
      "discriminator": [
        28,
        93,
        39,
        27,
        202,
        20,
        1,
        22
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "orderBookConfig"
        },
        {
          "name": "orderPositionConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "signer"
              },
              {
                "kind": "account",
                "path": "orderBookConfig"
              },
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  100,
                  101,
                  114,
                  45,
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110,
                  45,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "capitalA",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "signer"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "tokenMintA"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "capitalB",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "signer"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "tokenMintB"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenMintA"
        },
        {
          "name": "tokenMintB"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "createTradePair",
      "discriminator": [
        59,
        81,
        38,
        96,
        40,
        231,
        8,
        42
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "orderBookConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "tokenMintA"
              },
              {
                "kind": "account",
                "path": "tokenMintB"
              },
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  100,
                  101,
                  114,
                  45,
                  98,
                  111,
                  111,
                  107,
                  45,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "buyMarketPointer",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  121,
                  45,
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  45,
                  112,
                  111,
                  105,
                  110,
                  116,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "orderBookConfig"
              },
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  45,
                  112,
                  111,
                  105,
                  110,
                  116,
                  101,
                  114
                ]
              }
            ]
          }
        },
        {
          "name": "sellMarketPointer",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  108,
                  108,
                  45,
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  45,
                  112,
                  111,
                  105,
                  110,
                  116,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "orderBookConfig"
              },
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  45,
                  112,
                  111,
                  105,
                  110,
                  116,
                  101,
                  114
                ]
              }
            ]
          }
        },
        {
          "name": "tokenMintA"
        },
        {
          "name": "tokenMintB"
        },
        {
          "name": "tokenProgramA"
        },
        {
          "name": "tokenProgramB"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "tokenSymbolA",
          "type": "string"
        },
        {
          "name": "tokenSymbolB",
          "type": "string"
        },
        {
          "name": "isReverse",
          "type": "bool"
        }
      ]
    },
    {
      "name": "createVaultAccounts",
      "discriminator": [
        3,
        37,
        192,
        207,
        94,
        0,
        220,
        63
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "orderBookConfig"
        },
        {
          "name": "tokenMintA"
        },
        {
          "name": "tokenMintB"
        },
        {
          "name": "vaultA",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "orderBookConfig"
              },
              {
                "kind": "account",
                "path": "tokenMintA"
              },
              {
                "kind": "account",
                "path": "signer"
              },
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  45,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "vaultB",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "orderBookConfig"
              },
              {
                "kind": "account",
                "path": "tokenMintB"
              },
              {
                "kind": "account",
                "path": "signer"
              },
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  45,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgramA"
        },
        {
          "name": "tokenProgramB"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "fillMarketOrder",
      "discriminator": [
        166,
        245,
        22,
        221,
        108,
        30,
        58,
        253
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "orderBookConfig"
        },
        {
          "name": "marketPointer",
          "writable": true
        },
        {
          "name": "orderPosition",
          "writable": true
        },
        {
          "name": "takerSource",
          "writable": true
        },
        {
          "name": "makerDestination",
          "writable": true
        },
        {
          "name": "makerSource",
          "writable": true
        },
        {
          "name": "takerDestination",
          "writable": true
        },
        {
          "name": "tokenMintA"
        },
        {
          "name": "tokenMintB"
        },
        {
          "name": "tokenProgramA"
        },
        {
          "name": "tokenProgramB"
        }
      ],
      "args": []
    },
    {
      "name": "openOrderPosition",
      "discriminator": [
        184,
        65,
        216,
        220,
        255,
        252,
        171,
        46
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "orderBookConfig"
        },
        {
          "name": "marketPointerRead",
          "optional": true
        },
        {
          "name": "marketPointerWrite",
          "writable": true,
          "optional": true
        },
        {
          "name": "orderPosition",
          "writable": true
        },
        {
          "name": "orderPositionConfig",
          "writable": true
        },
        {
          "name": "prevOrderPosition",
          "writable": true,
          "optional": true
        },
        {
          "name": "nextOrderPosition",
          "writable": true,
          "optional": true
        },
        {
          "name": "nextPositionPointer",
          "optional": true
        }
      ],
      "args": []
    },
    {
      "name": "returnExecutionMarketOrder",
      "discriminator": [
        64,
        69,
        92,
        169,
        102,
        215,
        1,
        213
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "orderBookConfig"
        },
        {
          "name": "marketPointer",
          "writable": true
        },
        {
          "name": "source",
          "writable": true
        },
        {
          "name": "dest",
          "writable": true
        },
        {
          "name": "capitalSource",
          "docs": [
            "CHECKED: Don't need the data, only pubkey"
          ],
          "writable": true
        },
        {
          "name": "capitalDest",
          "docs": [
            "CHECKED: Don't need the data, only pubkey"
          ],
          "writable": true
        },
        {
          "name": "tokenMintSource"
        },
        {
          "name": "tokenMintDest"
        },
        {
          "name": "sourceProgram",
          "docs": [
            "CHECKED: validate owner of token mint source"
          ]
        },
        {
          "name": "destProgram",
          "docs": [
            "CHECKED: validate owner of token mint source"
          ]
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "marketPointer",
      "discriminator": [
        180,
        26,
        245,
        83,
        151,
        42,
        14,
        209
      ]
    },
    {
      "name": "orderBookConfig",
      "discriminator": [
        192,
        0,
        207,
        171,
        10,
        224,
        249,
        145
      ]
    },
    {
      "name": "orderPosition",
      "discriminator": [
        42,
        148,
        177,
        109,
        255,
        221,
        218,
        156
      ]
    },
    {
      "name": "orderPositionConfig",
      "discriminator": [
        184,
        103,
        139,
        69,
        199,
        52,
        35,
        243
      ]
    }
  ],
  "events": [
    {
      "name": "cancelLimitOrderEvent",
      "discriminator": [
        216,
        16,
        162,
        254,
        206,
        149,
        207,
        36
      ]
    },
    {
      "name": "closeLimitOrderEvent",
      "discriminator": [
        37,
        48,
        113,
        193,
        242,
        130,
        158,
        58
      ]
    },
    {
      "name": "createOrderPositionEvent",
      "discriminator": [
        172,
        251,
        54,
        147,
        127,
        165,
        156,
        166
      ]
    },
    {
      "name": "marketOrderCompleteEvent",
      "discriminator": [
        117,
        159,
        39,
        123,
        213,
        191,
        30,
        5
      ]
    },
    {
      "name": "marketOrderFillEvent",
      "discriminator": [
        154,
        188,
        223,
        75,
        178,
        109,
        84,
        46
      ]
    },
    {
      "name": "marketOrderTriggerEvent",
      "discriminator": [
        72,
        184,
        141,
        82,
        42,
        180,
        101,
        73
      ]
    },
    {
      "name": "newOrderBookConfigEvent",
      "discriminator": [
        212,
        127,
        42,
        69,
        195,
        133,
        17,
        145
      ]
    },
    {
      "name": "newOrderPositionConfigEvent",
      "discriminator": [
        135,
        248,
        180,
        220,
        179,
        224,
        202,
        103
      ]
    },
    {
      "name": "openLimitOrderEvent",
      "discriminator": [
        106,
        24,
        71,
        85,
        57,
        169,
        158,
        216
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidOrderBookConfig",
      "msg": "Invalid Order Book Config"
    },
    {
      "code": 6001,
      "name": "invalidOrderPositionOwner",
      "msg": "Invalid Order Position Owner"
    },
    {
      "code": 6002,
      "name": "invalidMint",
      "msg": "Invalid Mint"
    },
    {
      "code": 6003,
      "name": "invalidSource",
      "msg": "Invalid Token Account Source"
    },
    {
      "code": 6004,
      "name": "invalidDestination",
      "msg": "Invalid Token Account Destination"
    },
    {
      "code": 6005,
      "name": "invalidTokenProgram",
      "msg": "Invalid Token Program"
    },
    {
      "code": 6006,
      "name": "invalidOrderType",
      "msg": "Invalid Order Type"
    },
    {
      "code": 6007,
      "name": "invalidLedgerSection",
      "msg": "Invalid Ledger Section"
    },
    {
      "code": 6008,
      "name": "invalidOrderPosition",
      "msg": "Invalid Order Position"
    },
    {
      "code": 6009,
      "name": "invalidMarketPointer",
      "msg": "Invalid Market Pointer"
    },
    {
      "code": 6010,
      "name": "orderPositionIsNotAvailable",
      "msg": "Order Position Is Not Available"
    },
    {
      "code": 6011,
      "name": "invalidProcessReturnExecutionStatus",
      "msg": "Invalid Process Return Execution Status"
    },
    {
      "code": 6012,
      "name": "marketOrderAlreadyInProgress",
      "msg": "Market Order Already In Progress"
    },
    {
      "code": 6013,
      "name": "invalidTakerDestination",
      "msg": "Invalid Taker Destination"
    },
    {
      "code": 6014,
      "name": "invalidMakerSource",
      "msg": "Invalid Maker Source"
    },
    {
      "code": 6015,
      "name": "invalidMakerDestination",
      "msg": "Invalid Maker Destination"
    },
    {
      "code": 6016,
      "name": "invalidTakerSource",
      "msg": "Invalid Taker Source"
    },
    {
      "code": 6017,
      "name": "invalidVaultAccount",
      "msg": "Invalid Vault Account"
    },
    {
      "code": 6018,
      "name": "marketOrderNotInProgress",
      "msg": "Market Order Not In Progress"
    },
    {
      "code": 6019,
      "name": "invalidMarketOrderOwner",
      "msg": "Invalid Market Order Owner"
    },
    {
      "code": 6020,
      "name": "invalidFillOfMarketOrder",
      "msg": "Invalid Fill Of Market Order"
    },
    {
      "code": 6021,
      "name": "invalidAvailableStatus",
      "msg": "Invalid Available Status"
    },
    {
      "code": 6022,
      "name": "invalidOrderPositionAdd",
      "msg": "Invalid Order Position Add"
    },
    {
      "code": 6023,
      "name": "invalidOrderPositionRemove",
      "msg": "Invalid Order Position Remove"
    },
    {
      "code": 6024,
      "name": "invalidSymbolLength",
      "msg": "Invalid Symbol Length"
    },
    {
      "code": 6025,
      "name": "invalidOrderPositionConfig",
      "msg": "Invalid Order Position Config"
    },
    {
      "code": 6026,
      "name": "invalidMarketOrder",
      "msg": "Invalid Market Order"
    }
  ],
  "types": [
    {
      "name": "cancelLimitOrderEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "posPubkey",
            "type": "pubkey"
          },
          {
            "name": "bookConfig",
            "type": "pubkey"
          },
          {
            "name": "posConfig",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "isAvailable",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "closeLimitOrderEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "posPubkey",
            "type": "pubkey"
          },
          {
            "name": "bookConfig",
            "type": "pubkey"
          },
          {
            "name": "posConfig",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "createOrderPositionEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "posPubkey",
            "type": "pubkey"
          },
          {
            "name": "bookConfig",
            "type": "pubkey"
          },
          {
            "name": "posConfig",
            "type": "pubkey"
          },
          {
            "name": "orderType",
            "type": {
              "defined": {
                "name": "order"
              }
            }
          }
        ]
      }
    },
    {
      "name": "executionStats",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "capitalSource",
            "type": "pubkey"
          },
          {
            "name": "capitalDest",
            "type": "pubkey"
          },
          {
            "name": "source",
            "type": "pubkey"
          },
          {
            "name": "dest",
            "type": "pubkey"
          },
          {
            "name": "nextPositionPointer",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "totalAmount",
            "type": "u64"
          },
          {
            "name": "totalCost",
            "type": "u64"
          },
          {
            "name": "lastPrice",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "fill",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "partial",
            "fields": [
              {
                "name": "targetPrice",
                "type": "u64"
              }
            ]
          },
          {
            "name": "full"
          }
        ]
      }
    },
    {
      "name": "marketOrder",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "orderType",
            "type": {
              "defined": {
                "name": "order"
              }
            }
          },
          {
            "name": "fill",
            "type": {
              "defined": {
                "name": "fill"
              }
            }
          },
          {
            "name": "targetAmount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "marketOrderCompleteEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "marketPointer",
            "type": "pubkey"
          },
          {
            "name": "bookConfig",
            "type": "pubkey"
          },
          {
            "name": "newPointer",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "orderType",
            "type": {
              "defined": {
                "name": "order"
              }
            }
          },
          {
            "name": "totalCost",
            "type": "u64"
          },
          {
            "name": "totalAmount",
            "type": "u64"
          },
          {
            "name": "lastPrice",
            "type": "u64"
          },
          {
            "name": "isAvailable",
            "type": "bool"
          },
          {
            "name": "slot",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "marketOrderFillEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "marketPointer",
            "type": "pubkey"
          },
          {
            "name": "bookConfig",
            "type": "pubkey"
          },
          {
            "name": "posPubkey",
            "type": "pubkey"
          },
          {
            "name": "orderType",
            "type": {
              "defined": {
                "name": "order"
              }
            }
          },
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "total",
            "type": "u64"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "newSize",
            "type": "u64"
          },
          {
            "name": "isAvailable",
            "type": "bool"
          },
          {
            "name": "slot",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "marketOrderTriggerEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "marketPointer",
            "type": "pubkey"
          },
          {
            "name": "bookConfig",
            "type": "pubkey"
          },
          {
            "name": "capitalSource",
            "type": "pubkey"
          },
          {
            "name": "capitalDest",
            "type": "pubkey"
          },
          {
            "name": "source",
            "type": "pubkey"
          },
          {
            "name": "dest",
            "type": "pubkey"
          },
          {
            "name": "pointer",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "orderType",
            "type": {
              "defined": {
                "name": "order"
              }
            }
          },
          {
            "name": "isAvailable",
            "type": "bool"
          },
          {
            "name": "slot",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "marketPointer",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "orderType",
            "type": {
              "defined": {
                "name": "order"
              }
            }
          },
          {
            "name": "orderBookConfig",
            "type": "pubkey"
          },
          {
            "name": "orderPositionPointer",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "slot",
            "type": "u64"
          },
          {
            "name": "marketOrder",
            "type": {
              "option": {
                "defined": {
                  "name": "marketOrder"
                }
              }
            }
          },
          {
            "name": "executionStats",
            "type": {
              "option": {
                "defined": {
                  "name": "executionStats"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "newOrderBookConfigEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bookConfig",
            "type": "pubkey"
          },
          {
            "name": "tokenMintA",
            "type": "pubkey"
          },
          {
            "name": "tokenMintB",
            "type": "pubkey"
          },
          {
            "name": "tokenProgramA",
            "type": "pubkey"
          },
          {
            "name": "tokenProgramB",
            "type": "pubkey"
          },
          {
            "name": "sellMarketPointer",
            "type": "pubkey"
          },
          {
            "name": "buyMarketPointer",
            "type": "pubkey"
          },
          {
            "name": "tokenSymbolA",
            "type": "string"
          },
          {
            "name": "tokenSymbolB",
            "type": "string"
          },
          {
            "name": "tokenDecimalsA",
            "type": "u8"
          },
          {
            "name": "tokenDecimalsB",
            "type": "u8"
          },
          {
            "name": "isReverse",
            "type": "bool"
          },
          {
            "name": "slot",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "newOrderPositionConfigEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bookConfig",
            "type": "pubkey"
          },
          {
            "name": "posConfig",
            "type": "pubkey"
          },
          {
            "name": "marketMaker",
            "type": "pubkey"
          },
          {
            "name": "capitalA",
            "type": "pubkey"
          },
          {
            "name": "capitalB",
            "type": "pubkey"
          },
          {
            "name": "vaultA",
            "type": "pubkey"
          },
          {
            "name": "vaultB",
            "type": "pubkey"
          },
          {
            "name": "slot",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "openLimitOrderEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "posPubkey",
            "type": "pubkey"
          },
          {
            "name": "bookConfig",
            "type": "pubkey"
          },
          {
            "name": "posConfig",
            "type": "pubkey"
          },
          {
            "name": "source",
            "type": "pubkey"
          },
          {
            "name": "destination",
            "type": "pubkey"
          },
          {
            "name": "nextPosPubkey",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "orderType",
            "type": {
              "defined": {
                "name": "order"
              }
            }
          },
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "size",
            "type": "u64"
          },
          {
            "name": "slot",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "isAvailable",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "order",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "buy"
          },
          {
            "name": "sell"
          },
          {
            "name": "bid"
          },
          {
            "name": "ask"
          }
        ]
      }
    },
    {
      "name": "orderBookConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tokenProgramA",
            "type": "pubkey"
          },
          {
            "name": "tokenProgramB",
            "type": "pubkey"
          },
          {
            "name": "tokenMintA",
            "type": "pubkey"
          },
          {
            "name": "tokenMintB",
            "type": "pubkey"
          },
          {
            "name": "tokenSymbolA",
            "type": "string"
          },
          {
            "name": "tokenSymbolB",
            "type": "string"
          },
          {
            "name": "isReverse",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "orderPosition",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "orderBookConfig",
            "type": "pubkey"
          },
          {
            "name": "orderPositionConfig",
            "type": "pubkey"
          },
          {
            "name": "source",
            "type": "pubkey"
          },
          {
            "name": "destination",
            "type": "pubkey"
          },
          {
            "name": "nextOrderPosition",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "orderType",
            "type": {
              "defined": {
                "name": "order"
              }
            }
          },
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "receivedAmount",
            "type": "u64"
          },
          {
            "name": "slot",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "isAvailable",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "orderPositionConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "orderBookConfig",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "capitalA",
            "type": "pubkey"
          },
          {
            "name": "capitalB",
            "type": "pubkey"
          },
          {
            "name": "nonce",
            "type": "u64"
          }
        ]
      }
    }
  ]
};
