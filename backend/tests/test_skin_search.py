import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import asset_cache, storefront

TIER_PREMIUM = "12683d76-48d7-84a3-4e09-6985794f0445"


def _skin(uuid: str, name: str, tier: str = TIER_PREMIUM) -> dict:
    return {
        "uuid": uuid,
        "displayName": name,
        "displayIcon": f"https://example.test/{uuid}.png",
        "contentTierUuid": tier,
        "levels": [],
    }


@pytest.fixture(autouse=True)
def fake_cache():
    """Fill the module-level caches with a few skins, restore them afterwards."""
    saved = (dict(asset_cache._skins), dict(asset_cache._content_tiers))
    asset_cache._skins.clear()
    asset_cache._content_tiers.clear()

    asset_cache._content_tiers[TIER_PREMIUM] = {
        "name": "Premium",
        "display_icon": "",
        "highlight_color": "d1548dff",
    }
    for skin in [
        _skin("a1", "Reaver Vandal"),
        _skin("a2", "Reaver Knife"),
        _skin("a3", "Prelude to Chaos Vandal"),
        _skin("a4", "Standard Vandal", tier=""),
        _skin("a5", "Random Favorite Skin", tier=""),
        _skin("a6", "Oni Phantom"),
    ]:
        asset_cache._skins[skin["uuid"]] = skin

    yield

    asset_cache._skins.clear()
    asset_cache._skins.update(saved[0])
    asset_cache._content_tiers.clear()
    asset_cache._content_tiers.update(saved[1])


def test_search_matches_every_token_in_any_order():
    names = [s["displayName"] for s in asset_cache.search_skins("vandal reaver")]
    assert names == ["Reaver Vandal"]


def test_search_is_case_insensitive_and_ranks_prefix_first():
    names = [s["displayName"] for s in asset_cache.search_skins("VANDAL")]
    # "Prelude to Chaos Vandal" and "Reaver Vandal" both contain it, alphabetical order
    assert names == ["Prelude to Chaos Vandal", "Reaver Vandal"]

    names = [s["displayName"] for s in asset_cache.search_skins("reaver")]
    assert names == ["Reaver Knife", "Reaver Vandal"]


def test_search_excludes_default_and_tierless_skins():
    assert asset_cache.search_skins("standard") == []
    assert asset_cache.search_skins("random favorite") == []


def test_search_respects_limit_and_blank_query():
    assert len(asset_cache.search_skins("reaver", limit=1)) == 1
    assert asset_cache.search_skins("   ") == []


def test_search_endpoint_returns_skin_info():
    client = TestClient(app)  # no context manager: lifespan (network fetch) is skipped
    resp = client.get("/api/store/skins/search", params={"q": "oni"})

    assert resp.status_code == 200
    assert resp.json()["results"] == [
        {
            "uuid": "a6",
            "name": "Oni Phantom",
            "display_icon": "https://example.test/a6.png",
            "content_tier_uuid": TIER_PREMIUM,
            "content_tier_name": "Premium",
            "content_tier_color": "d1548dff",
        }
    ]


def test_search_endpoint_validates_query_length():
    client = TestClient(app)
    assert client.get("/api/store/skins/search", params={"q": "a"}).status_code == 422
    assert client.get("/api/store/skins/search").status_code == 422


def test_bundle_items_expose_skin_uuid_and_tier():
    # Bundle items reference skin *level* UUIDs; the parent skin must be resolved.
    asset_cache._skins["a1"]["levels"] = [{"uuid": "level-1"}]
    asset_cache._skin_levels_to_skin["level-1"] = asset_cache._skins["a1"]
    try:
        raw = {
            "FeaturedBundle": {
                "Bundles": [
                    {
                        "DataAssetID": "bundle-x",
                        "DurationRemainingInSeconds": 100,
                        "Items": [
                            {
                                "Item": {"ItemID": "level-1"},
                                "BasePrice": 1775,
                                "DiscountedPrice": 1500,
                                "DiscountPercent": 0.15,
                            },
                            {
                                "Item": {"ItemID": "not-a-skin"},
                                "BasePrice": 100,
                                "DiscountedPrice": 100,
                            },
                        ],
                    }
                ]
            }
        }
        items = storefront.get_featured_bundle(raw).bundles[0].items
    finally:
        asset_cache._skin_levels_to_skin.pop("level-1", None)

    assert items[0].skin_uuid == "a1"
    assert items[0].content_tier_name == "Premium"
    assert items[1].skin_uuid is None
    assert items[1].content_tier_name == ""
