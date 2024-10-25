INSERT INTO order_position (
    "pubkey_id",
    "book_config",
    "position_config",
    "next_position",
    "source_vault",
    "destination_vault",
    "order_type",
    "price",
    "size",
    "is_available",
    "slot",
    "timestamp"
) VALUES 

---  ASKS
(
    '6zPygCQ6WbJKjxFS1hiNiRyqdzsnhKUiCH8u5wzHQ2R3',
    'BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK',
    'C9zVweJ1kCnzVeGpqBVpBSxZYY5Khsec7TqCXNmxcQMs',
    NULL,
    'DMWSPLsKwJrU3a1pNJxWZ3Gb6JykPFSKWtxVR8svhqrB',
    'H2NyxBpLBXxjuGMurB9kLJbePaghhEqDenXyptWJaUFe',
    'ask',
    23,
    2,
    'true',
    0,
    0
),

(
    '2jyMQLboCoaanNPE9iopujVyQPPGQngsaELdyTYeUi3G',
    'BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK',
    'C9zVweJ1kCnzVeGpqBVpBSxZYY5Khsec7TqCXNmxcQMs',
    '6zPygCQ6WbJKjxFS1hiNiRyqdzsnhKUiCH8u5wzHQ2R3',
    'DMWSPLsKwJrU3a1pNJxWZ3Gb6JykPFSKWtxVR8svhqrB',
    'H2NyxBpLBXxjuGMurB9kLJbePaghhEqDenXyptWJaUFe',
    'ask',
    22,
    2,
    'true',
    0,
    0
),

(
    'A9SS2WD9VXUrrqoWfLzKnmP3MZJWHCgxFDEQB2UaC58Q',
    'BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK',
    'C9zVweJ1kCnzVeGpqBVpBSxZYY5Khsec7TqCXNmxcQMs',
    '2jyMQLboCoaanNPE9iopujVyQPPGQngsaELdyTYeUi3G',
    'DMWSPLsKwJrU3a1pNJxWZ3Gb6JykPFSKWtxVR8svhqrB',
    'H2NyxBpLBXxjuGMurB9kLJbePaghhEqDenXyptWJaUFe',
    'ask',
    20,
    2,
    'true',
    0,
    0
),




--- BIDS
(
    'Eu9u82SSVWHHC9jX95dSUjEXEJq9M1iMp1q2SzEBHZLG',
    'BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK',
    '49wBdBzzw9eMre1wT27TD1b8hgW9x9tCWFtvAUmLohtp',
    '4fZ37ubXJRKdny7rbzWupY9pjmdE2TuYGCHRqT4289Dd',
    'DMWSPLsKwJrU3a1pNJxWZ3Gb6JykPFSKWtxVR8svhqrB',
    'H2NyxBpLBXxjuGMurB9kLJbePaghhEqDenXyptWJaUFe',
    'bid',
    10,
    2,
    'true',
    0,
    0
),

(
    '4fZ37ubXJRKdny7rbzWupY9pjmdE2TuYGCHRqT4289Dd',
    'BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK',
    '3yJALi5ZMjXnNQvFyPE2sMKjPNYZtZ8jNBxajcGxWp2w',
    'DEzhUGmkygYriVV79WYZak4LFz4MTS7XpJBKaG8L31th',
    'DMWSPLsKwJrU3a1pNJxWZ3Gb6JykPFSKWtxVR8svhqrB',
    'H2NyxBpLBXxjuGMurB9kLJbePaghhEqDenXyptWJaUFe',
    'bid',
    8,
    2,
    'true',
    0,
    0
),

(
    'DEzhUGmkygYriVV79WYZak4LFz4MTS7XpJBKaG8L31th',
    'BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK',
    '3yJALi5ZMjXnNQvFyPE2sMKjPNYZtZ8jNBxajcGxWp2w',
    NULL,
    'DMWSPLsKwJrU3a1pNJxWZ3Gb6JykPFSKWtxVR8svhqrB',
    'H2NyxBpLBXxjuGMurB9kLJbePaghhEqDenXyptWJaUFe',
    'bid',
    5,
    2,
    'true',
    0,
    0
);


