

CREATE TABLE users (
    id TEXT UNIQUE PRIMARY KEY,
    fullname TEXT,
    email TEXT UNIQUE NOT NULL,
    picture_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);


CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    current_status TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;