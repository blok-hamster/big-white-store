import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer: React.FC = () => {
    return (
        <footer className="app-footer">
            <div className="container">
                <div className="footer-content">
                    <div className="footer-section footer-brand">
                        <img
                            src="/bigwhiteLogo.png"
                            alt="Big White"
                            className="footer-logo"
                        />
                        <p className="footer-description">
                            Minimalist fashion for the modern era. Quality, simplicity, and style.
                        </p>
                    </div>

                    <div className="footer-section">
                        <h4 className="footer-heading">Shop</h4>
                        <ul className="footer-links">
                            <li><Link to="/category/new-arrivals">New Arrivals</Link></li>
                            <li><Link to="/category/mens">Men</Link></li>
                            <li><Link to="/category/womens">Women</Link></li>
                            <li><Link to="/category/accessories">Accessories</Link></li>
                        </ul>
                    </div>

                    <div className="footer-section">
                        <h4 className="footer-heading">Support</h4>
                        <ul className="footer-links">
                            <li><Link to="/contact">Contact Us</Link></li>
                            <li><Link to="/shipping">Shipping & Returns</Link></li>
                            <li><Link to="/faq">FAQ</Link></li>
                            <li><Link to="/privacy">Privacy Policy</Link></li>
                        </ul>
                    </div>

                    <div className="footer-section newsletter">
                        <h4 className="footer-heading">Stay Updated</h4>
                        <p>Subscribe to our newsletter for the latest drops.</p>
                        <form className="newsletter-form" onSubmit={(e) => e.preventDefault()}>
                            <input
                                type="email"
                                placeholder="ENTER YOUR EMAIL"
                                className="newsletter-input"
                            />
                            <button type="submit" className="newsletter-button">
                                SUBSCRIBE
                            </button>
                        </form>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p>&copy; {new Date().getFullYear()} Big White Store. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
