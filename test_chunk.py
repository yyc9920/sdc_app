lvl_sentences = list(range(18))
chunk_size = 15
chunks = [
    lvl_sentences[i : i + chunk_size]
    for i in range(0, len(lvl_sentences), chunk_size)
]
if len(chunks) > 1 and len(chunks[-1]) < 4:
    if len(chunks[-2]) + len(chunks[-1]) <= 15:
        chunks[-2].extend(chunks[-1])
        chunks.pop()

print([len(c) for c in chunks])
