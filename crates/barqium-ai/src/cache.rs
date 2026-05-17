use std::sync::RwLock;

use instant_distance::{Builder, HnswMap, Point};
use tracing::debug;

use crate::types::{ChatRequest, ChatResponse};

#[derive(Clone)]
struct Entry {
    embedding: Vec<f32>,
    response: ChatResponse,
}

/// Owned embedding vector implementing the `Point` trait with cosine distance.
#[derive(Clone)]
struct EmbPoint(Vec<f32>);

impl Point for EmbPoint {
    fn distance(&self, other: &Self) -> f32 {
        let dot: f32 = self.0.iter().zip(other.0.iter()).map(|(a, b)| a * b).sum();
        let na: f32 = self.0.iter().map(|x| x * x).sum::<f32>().sqrt();
        let nb: f32 = other.0.iter().map(|x| x * x).sum::<f32>().sqrt();
        if na == 0.0 || nb == 0.0 {
            return 1.0;
        }
        1.0 - (dot / (na * nb))
    }
}

/// In-memory semantic cache backed by an HNSW approximate nearest-neighbour index.
///
/// The caller is responsible for producing embeddings. The cache stores the
/// embedding alongside the original response and returns a hit when the nearest
/// neighbour is within `threshold` cosine distance.
pub struct SemanticCache {
    entries: RwLock<Vec<Entry>>,
    /// Maximum cosine distance to accept as a cache hit (0.0 = exact, 1.0 = anything).
    threshold: f32,
    rebuild_every: usize,
    inserts_since_rebuild: RwLock<usize>,
    index: RwLock<Option<HnswMap<EmbPoint, usize>>>,
}

impl SemanticCache {
    pub fn new(threshold: f32, rebuild_every: usize) -> Self {
        Self {
            entries: RwLock::new(Vec::new()),
            threshold,
            rebuild_every,
            inserts_since_rebuild: RwLock::new(0),
            index: RwLock::new(None),
        }
    }

    /// Insert a response into the cache keyed by its embedding vector.
    pub fn insert(&self, embedding: Vec<f32>, response: ChatResponse) {
        {
            let mut entries = self.entries.write().expect("cache write lock");
            entries.push(Entry {
                embedding,
                response,
            });
        }
        let mut count = self.inserts_since_rebuild.write().expect("counter lock");
        *count += 1;
        if *count >= self.rebuild_every {
            *count = 0;
            drop(count);
            self.rebuild_index();
        }
    }

    /// Return a cached response if the nearest neighbour is within `threshold`.
    pub fn get(&self, embedding: &[f32], _req: &ChatRequest) -> Option<ChatResponse> {
        let index_guard = self.index.read().expect("index read lock");
        let index = index_guard.as_ref()?;

        let query = EmbPoint(embedding.to_vec());
        let mut search = instant_distance::Search::default();
        let hits: Vec<_> = index.search(&query, &mut search).collect();

        let best = hits.into_iter().next()?;
        let distance = best.distance;
        if distance > self.threshold {
            debug!(distance, threshold = self.threshold, "cache miss");
            return None;
        }

        let entries = self.entries.read().expect("entries read lock");
        let idx = *best.value;
        debug!(distance, idx, "semantic cache hit");
        entries.get(idx).map(|e| e.response.clone())
    }

    fn rebuild_index(&self) {
        // Collect the data we need while holding the read lock, then release
        // it before the expensive HNSW build and the write-lock acquisition to
        // minimise contention on the entries RwLock.
        let points: Vec<EmbPoint> = {
            let entries = self.entries.read().expect("entries read lock");
            if entries.is_empty() {
                return;
            }
            entries
                .iter()
                .map(|e| EmbPoint(e.embedding.clone()))
                .collect()
        };

        let n = points.len();
        let values: Vec<usize> = (0..n).collect();
        let new_index = Builder::default().build(points, values);

        let mut index = self.index.write().expect("index write lock");
        *index = Some(new_index);
        debug!(entries = n, "semantic cache HNSW index rebuilt");
    }
}
