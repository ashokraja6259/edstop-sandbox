# Soft-launch food menu import review

This repository change stages four replacement outlets and 884 purchasable
menu rows. It does not activate them, deactivate the currently public outlets,
delete any row, or change Production.

## Staged outlets

| Display order | Outlet | Logical dishes | Purchasable rows |
| ---: | --- | ---: | ---: |
| 1 | Amigos Grill Cafe | 429 | 529 |
| 2 | Spicy Darbar | 176 | 188 |
| 3 | Amigos Andhra Bhawan | 39 | 39 |
| 4 | Red Panda | 94 | 128 |
| | **Total** | **738** | **884** |

Deployment prices use the approved non-discounted prices from the final PDFs;
lower student/offer prices are not imported. Prices with multiple portions are separate `menu_items` rows so the
existing cart and atomic checkout continue to obtain the exact selected price
from `menu_items.price`. All staged restaurants and menu rows are unavailable.

## Approved source handling decisions

- `GRILL CAFE 1.pdf` is structurally damaged: its early object/xref region is
  zeroed and the cover could not be recovered. Eight remaining pages were
  recovered for visual comparison. Their 66 menu entries duplicate the later,
  complete `AMIGOS 1.pdf` master.
- Peri-Peri Chicken Mac & Cheese uses the approved customer-facing price of
  **₹229** from `AMIGOS 1.pdf` page 36.
- Veg Arabian Mandi uses the final business-approved deployment prices:
  **Single Serving ₹249**, **Half Platter ₹499**, and **Full Platter ₹799**.
- Printed wording, portion capitalization, classifications, and descriptions
  are preserved even when they appear inconsistent. Confirmed examples include
  `Online Portion Half`, `SHalf Portion`, `FSingle Serving`, Tandoori Mushroom
  labelled Non-Veg in the AMIGOS master, Amigos Raju Gari Kodi Pulao labelled
  Veg, and several fish/prawn descriptions that say chicken.
- The AMIGOS master prints Greek Salad twice: ₹249/₹329 under Vegetarian
  Biryanis & Pulao and ₹179 under Salads. All three printed purchasable rows are
  staged.

## Schema and activation safety

The additive migration adds nullable display/source metadata columns and
upserts deterministic restaurant and menu IDs. It preserves `owner_id`, does
not touch orders, order items, wallets, payments, RLS, or RPCs, and leaves the
four outlets inactive, closed, and unavailable. Existing outlets remain unchanged.

Vendor ownership is intentionally not assigned by this import. Before any
Production activation, an operator must assign the correct existing vendor
identities, take a backup, apply the migration, validate the hidden rows, and
request separate approval for an atomic outlet visibility switch.
