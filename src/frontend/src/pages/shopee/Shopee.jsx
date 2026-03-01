import React, { useState } from 'react'

import { getProduct } from '../../services/product'

import Navbar from '../../components/Navbar/Navbar'
import ProductCard from '../../components/ProductCart/ProductCart'

async function Shopee() {

    const products = await getProduct()
    
    return (
        <div className="home-container">
            <Navbar />

            
        </div>
    )
}
export default Shopee