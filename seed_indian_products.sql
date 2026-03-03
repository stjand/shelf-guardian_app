-- ShelfGuard: Seed Indian Products Database
-- Run this in your Supabase SQL Editor at:
-- https://supabase.com/dashboard/project/nrvwidnxmbnodluufddt/editor
--
-- This inserts common Indian products so barcode scans are instant.
-- Uses ON CONFLICT (barcode) DO NOTHING to safely re-run without duplicates.

INSERT INTO products (barcode, name, brand, category) VALUES
  -- Snacks & Biscuits
  ('8904004400762', 'Haldiram''s Aloo Bhujia (150g)',         'Haldiram''s',  'Snacks'),
  ('8904004400076', 'Haldiram''s Bhujia Sev (150g)',          'Haldiram''s',  'Snacks'),
  ('8901719101038', 'Parle-G Gluco Biscuits (56g)',           'Parle',         'Biscuits'),
  ('8901063093089', 'Britannia Good Day Cashew Cookies (100g)','Britannia',    'Biscuits'),
  ('8901725131012', 'Sunfeast Dark Fantasy Choco Fills (75g)', 'Sunfeast',     'Biscuits'),
  ('8901491101837', 'Kurkure Masala Munch (90g)',              'Kurkure',      'Snacks'),
  ('8901491503112', 'Lay''s India''s Magic Masala (52g)',     'Lay''s',        'Snacks'),
  ('8901719117183', 'Hide & Seek Chocolate Chip Cookies (100g)','Parle',       'Biscuits'),
  ('8906009078014', 'Unibic Butter Cookies (75g)',             'Unibic',       'Biscuits'),
  ('8906009077017', 'Unibic Fruit & Nut Cookies (75g)',        'Unibic',       'Biscuits'),
  ('8901719127977', 'Monaco Piri Piri (103g)',                 'Parle',         'Biscuits'),

  -- Dairy & Beverages
  ('8901262200196', 'Amul Butter Milk (200ml)',                'Amul',         'Dairy'),
  ('8901262030151', 'Amul Cheese Tin (400g)',                  'Amul',         'Dairy'),
  ('8901262060011', 'Amul Pure Ghee (1L)',                     'Amul',         'Dairy'),
  ('8901262010016', 'Amul Fresh Cream (1L)',                   'Amul',         'Dairy'),
  ('8901262120005', 'Amul Mithai Mate Condensed Milk',         'Amul',         'Dairy'),
  ('8901030345029', 'Red Label Tea (500g)',                    'Brooke Bond',  'Beverages'),
  ('8901052003051', 'Tata Tea Gold (500g)',                    'Tata Tea',     'Beverages'),
  ('8901030531552', 'Bru Instant Coffee (100g)',               'Bru',          'Beverages'),
  ('8901888035714', 'Real Fruit Power Apple Juice (1L)',       'Real',         'Beverages'),
  ('8901030322983', 'Kissan Apple Juice (1L)',                 'Kissan',       'Beverages'),
  ('8901030329562', 'Kissan Apple Juice (1L)',                 'Kissan',       'Beverages'),
  ('8901030324833', 'Kissan Mixed Fruit Jam (500g)',           'Kissan',       'Condiments'),
  ('8901030922787', 'Kissan Mixed Fruit Squash (700ml)',       'Kissan',       'Beverages'),
  ('8901030807138', 'Horlicks Classic Malt (200g)',            'Horlicks',     'Beverages'),
  ('8901207001413', 'Dabur Glucose-D (200g)',                  'Dabur',        'Beverages'),
  ('8901233006956', 'Tang Orange Flavored Drink (500g)',       'Tang',         'Beverages'),
  ('8901138815264', 'Himalaya Green Tea (20 bags)',            'Himalaya',     'Beverages'),

  -- Noodles & Staples
  ('8901058017687', 'Maggi 2-Minute Masala Noodles (70g)',     'Maggi',        'Noodles'),
  ('8901058901566', 'Maggi Masala-Ae-Magic (Sachet)',          'Maggi',        'Condiments'),
  ('8904043901015', 'Tata Salt (1kg)',                         'Tata Salt',    'Staples'),
  ('8904109470240', 'Patanjali Whole Wheat Atta (5kg)',        'Patanjali',    'Staples'),
  ('8904109461002', 'Patanjali Mustard Oil (1L)',              'Patanjali',    'Cooking Oils'),
  ('8906007280051', 'Fortune Soya Health Oil (1L)',            'Fortune',      'Cooking Oils'),
  ('8901042969725', 'MTR Gulab Jamun Mix',                    'MTR',          'Ready Mix'),

  -- Home & Personal Care
  ('8901395721117', 'Dettol Original Soap (125g)',             'Dettol',       'Personal Care'),
  ('8901030678653', 'Surf Excel Quick Wash (1kg)',             'Surf Excel',   'Home Care'),
  ('8901030962349', 'Surf Excel Matic Front Load (2L)',        'Surf Excel',   'Home Care'),
  ('8901314308085', 'Colgate Vedshakti Toothpaste (100g)',     'Colgate',      'Personal Care'),
  ('8901207015502', 'Dabur Red Toothpaste (100g)',             'Dabur',        'Personal Care'),
  ('8901138511470', 'Himalaya Purifying Neem Face Wash (100ml)','Himalaya',   'Personal Care'),
  ('8901288011004', 'Vicco Vajradanti Paste (100g)',           'Vicco',        'Personal Care'),
  ('8901207029592', 'Odonil Zipper Air Freshener (10g)',       'Odonil',       'Home Care')

ON CONFLICT (barcode) DO NOTHING;

-- Verify how many were inserted:
SELECT COUNT(*) AS total_products FROM products;
