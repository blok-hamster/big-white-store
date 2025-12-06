import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAutoSeed } from '../../hooks/useAutoSeed';
import SeederBanner from '../SeederBanner/SeederBanner';
import './HomePage.css';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { shouldShowSeeder, isSeeding, seedDatabase, dismissSeeder } = useAutoSeed();
  const [currentSlide, setCurrentSlide] = useState(0);

  const heroSlides = [
    {
      id: 1,
      image: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&q=80&w=2000',
      title: 'BIG WHITE',
      subtitle: 'Minimalist Fashion for the Modern Era',
      link: '/category/new-arrivals',
      cta: 'SHOP COLLECTION'
    },
    {
      id: 2,
      image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=2000',
      title: 'SUMMER 2025',
      subtitle: 'The New Collection is Here',
      link: '/category/womens',
      cta: 'EXPLORE NOW'
    },
    {
      id: 3,
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=2000',
      title: 'ESSENTIALS',
      subtitle: 'Timeless Accessories for Every Day',
      link: '/category/accessories',
      cta: 'SHOP ACCESSORIES'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [heroSlides.length]);

  const categories = [
    { id: 'mens', name: "Men's", image: 'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?auto=format&fit=crop&q=80&w=800' },
    { id: 'womens', name: "Women's", image: 'https://images.unsplash.com/photo-1503342217505-b0815a046baf?auto=format&fit=crop&q=80&w=800' },
    { id: 'accessories', name: "Accessories", image: 'https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?auto=format&fit=crop&q=80&w=800' }
  ];

  return (
    <div className="home-page">
      {shouldShowSeeder && (
        <SeederBanner
          onSeed={seedDatabase}
          onDismiss={dismissSeeder}
          isSeeding={isSeeding}
        />
      )}

      {/* Hero Carousel Section */}
      <section className="hero-section">
        {heroSlides.map((slide, index) => (
          <div
            key={slide.id}
            className={`hero-slide ${index === currentSlide ? 'active' : ''}`}
            style={{ backgroundImage: `url(${slide.image})` }}
          >
            <div className="hero-overlay"></div>
            <div className="hero-content">
              <h1 className="hero-title">{slide.title}</h1>
              <p className="hero-subtitle">{slide.subtitle}</p>
              <button className="btn btn-primary hero-cta" onClick={() => navigate(slide.link)}>
                {slide.cta}
              </button>
            </div>
          </div>
        ))}

        <div className="hero-indicators">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              className={`hero-indicator ${index === currentSlide ? 'active' : ''}`}
              onClick={() => setCurrentSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </section>

      {/* Categories Grid */}
      <section className="categories-section home-categories-section container" style={{ marginBottom: '100px' }}>
        <h2 className="section-title">Shop by Category</h2>
        <div className="categories-grid">
          {categories.map(category => (
            <div
              key={category.id}
              className="category-card"
              onClick={() => navigate(`/category/${category.id}`)}
              style={{ backgroundImage: `url(${category.image})` }}
            >
              <div className="category-overlay">
                <h3>{category.name}</h3>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured / Sale Section */}
      <section className="featured-section">
        <div className="container">
          <div className="featured-content">
            <h2>Summer Collection 2025</h2>
            <p>Discover the essence of pure style.</p>
            <button
              className="btn btn-secondary btn-inverted"
              onClick={() => navigate('/category/collections')}
              style={{
                backgroundColor: 'transparent',
                color: '#FFFFFF',
                borderColor: '#FFFFFF'
              }}
            >
              View Collection
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
