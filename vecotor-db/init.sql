-- Enable the vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the vehicle table
CREATE TABLE IF NOT EXISTS vehicle (
    id SERIAL PRIMARY KEY,
    model TEXT NOT NULL,
    price INTEGER NOT NULL,
    fuel_type TEXT CHECK (fuel_type IN ('electric', 'petrol', 'diesel', 'hybrid')),
    type TEXT,
    description TEXT,
    embedding vector(768)
);

-- Index for high-performance vector search
CREATE INDEX ON vehicle USING hnsw (embedding vector_cosine_ops);

-- Seed data for testing
INSERT INTO vehicle (id, model, price, fuel_type, description) VALUES
(5, 'Toyota RAV4 Hybrid', 53500, 'Hybrid', 'The top-selling vehicle in NZ. A reliable petrol-hybrid SUV perfect for families, offering 1,000km range and advanced safety features.'),
(6, 'Mitsubishi ASX', 28990, 'Petrol', 'A compact and affordable urban SUV with a 10.6m turning circle, reversing camera, and an 8-inch touchscreen.'),
(7, 'Tesla Model Y', 67900, 'Electric', 'A tech-heavy electric SUV featuring a minimalist interior, massive cargo space, and a 455km WLTP range.'),
(8, 'BYD Sealion 6', 57990, 'PHEV', 'A "Super Hybrid" SUV with 92km of pure electric range and a total travel distance of up to 1,100km on a full tank/charge.'),
(9, 'Suzuki Swift Hybrid', 27900, 'Hybrid', 'A nimble, fuel-efficient hatchback using a mild-hybrid system. The rational economic choice for city commuting.'),
(10, 'Kia Seltos', 32500, 'Petrol', 'A stylish compact SUV designed for urban living, featuring Apple CarPlay, Android Auto, and a high seating position.'),
(11, 'Ford Ranger', 63990, 'Diesel', 'New Zealand''s favorite ute. Rugged and powerful for towing or off-roading, yet equipped with modern driver-assist tech.'),
(12, 'Honda Jazz e:HEV', 36700, 'Hybrid', 'A clever small car using a generator-based hybrid system for instant torque. Features the versatile "Magic Seats" for extra cargo.'),
(13, 'MG ZS EV', 44990, 'Electric', 'One of the most affordable fully electric SUVs in NZ, offering a practical range and a comprehensive 7-year warranty.'),
(14, 'Toyota Corolla Hybrid', 38500, 'Hybrid', 'The gold standard for reliable hatchbacks. Exceptionally low fuel consumption and high resale value for Kiwi owners.');