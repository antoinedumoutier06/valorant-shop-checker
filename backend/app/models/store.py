from pydantic import BaseModel


class SkinInfo(BaseModel):
    uuid: str
    name: str
    display_icon: str
    content_tier_uuid: str
    content_tier_name: str
    content_tier_color: str


class SkinOffer(SkinInfo):
    cost: int


class SkinSearchResponse(BaseModel):
    results: list[SkinInfo]


class BundleItem(BaseModel):
    uuid: str
    # Parent skin UUID when the item is a weapon skin (used to match the wishlist).
    skin_uuid: str | None = None
    name: str
    display_icon: str
    content_tier_name: str = ""
    content_tier_color: str = ""
    base_price: int
    discounted_price: int
    discount_percent: float


class Bundle(BaseModel):
    uuid: str
    name: str
    display_icon: str | None = None
    items: list[BundleItem]
    total_base_price: int
    total_discounted_price: int
    duration_remaining_secs: int


class Wallet(BaseModel):
    valorant_points: int
    radianite_points: int


class DailyStoreResponse(BaseModel):
    offers: list[SkinOffer]
    seconds_remaining: int


class BundleResponse(BaseModel):
    bundles: list[Bundle]
