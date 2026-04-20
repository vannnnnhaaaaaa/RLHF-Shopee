"""
Shipping Service — Tính phí vận chuyển dựa trên khoảng cách Haversine.
"""
import math
from typing import Tuple


def haversine_distance(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float
) -> float:
    """
    Tính khoảng cách đường chim bay (km) giữa 2 tọa độ lat/lon
    bằng Công thức Haversine.

    Args:
        lat1, lon1: Tọa độ điểm bắt đầu (shop)
        lat2, lon2: Tọa độ điểm kết thúc (người nhận)

    Returns:
        Khoảng cách tính bằng km (float)
    """
    R = 6371.0  # Bán kính Trái Đất (km)

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


def calculate_shipping_fee(
    shop_lat: float,
    shop_lon: float,
    user_lat: float,
    user_lon: float
) -> Tuple[float, int]:
    """
    Tính phí vận chuyển giữa kho hàng của shop và địa chỉ giao hàng.

    Logic:
        - Khoảng cách < 3km  →  đồng giá 15.000đ
        - Từ km thứ 3 trở đi →  cộng thêm 5.000đ/km

    Args:
        shop_lat, shop_lon: Tọa độ kho hàng của shop
        user_lat, user_lon:  Tọa độ địa chỉ giao hàng của khách

    Returns:
        Tuple[distance_km, shipping_fee]:
            - distance_km    : float  — khoảng cách km (làm tròn 2 chữ số)
            - shipping_fee   : int    — phí vận chuyển (VND)
    """
    distance_km = haversine_distance(shop_lat, shop_lon, user_lat, user_lon)
    distance_km = round(distance_km, 2)

    if distance_km < 3:
        fee = 15000
    else:
        extra_km = distance_km - 3
        fee = 15000 + int(extra_km * 5000)

    return distance_km, fee
