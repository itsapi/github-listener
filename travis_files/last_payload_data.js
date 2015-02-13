GitHub
======

{ slug:   last_payload.repository.full_name
, branch: last_payload.ref.replace(/^refs\/heads\//, '')
, commit: last_payload.head_commit.message
, url:    last_payload.repository.url
, image:  last_payload.sender.avatar_url
}

Travis
======

{ slug:   req.headers['travis-repo-slug']
, branch: last_payload.branch
, commit: last_payload.message
, url:    last_payload.repository.url
}