if (
  localStorage.getItem('access_token') &&
  localStorage.getItem('refresh_token') &&
  localStorage.getItem('access_token') !== undefined &&
  localStorage.getItem('refresh_token') !== undefined
) {
  playlistSelect();
} else {
  document.getElementById('auth').classList.remove('d-none');
}

if (
  new URLSearchParams(window.location.search).get('code') !== null &&
  new URLSearchParams(window.location.search).get('state') !== null
) {
  if (
    localStorage.getItem('state') ===
    new URLSearchParams(window.location.search).get('state')
  ) {
    fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: new URLSearchParams(window.location.search).get('code'),
        redirect_uri:
          location.protocol + '//' + location.host + location.pathname,
        client_id: '1b7c6049734a4b7e9c3c8810aa715350',
        code_verifier: localStorage.getItem('code'),
      }),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
      .then((response) => response.json())
      .then((data) => {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        playlistSelect();
      });
  } else {
    alert('Error: Invalid state.');
  }
} else if (
  new URLSearchParams(window.location.search).get('error') !== null &&
  new URLSearchParams(window.location.search).get('state') !== null
) {
  alert(`Error: ${new URLSearchParams(window.location.search).get('error')}`);
}

localStorage.removeItem('state');
localStorage.removeItem('code');
history.replaceState(
  {},
  '',
  location.protocol + '//' + location.host + location.pathname
);

document
  .getElementById('spotifyAuth')
  .addEventListener('click', async (event) => {
    localStorage.setItem('state', id(16));
    localStorage.setItem('code', id(64));

    window.location.href =
      'https://accounts.spotify.com/authorize?' +
      new URLSearchParams({
        response_type: 'code',
        client_id: '1b7c6049734a4b7e9c3c8810aa715350',
        scope: 'streaming playlist-read-private user-read-recently-played',
        redirect_uri:
          location.protocol + '//' + location.host + location.pathname,
        state: localStorage.getItem('state'),
        code_challenge_method: 'S256',
        code_challenge: await pkce_challenge_from_verifier(
          localStorage.getItem('code')
        ),
      });
  });

function id(length) {
  let result = '';
  let characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
}

function base64urlencode(a) {
  return btoa(String.fromCharCode.apply(null, new Uint8Array(a)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function pkce_challenge_from_verifier(v) {
  hashed = await sha256(v);
  base64encoded = base64urlencode(hashed);
  return base64encoded;
}

async function refresh() {
  fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: localStorage.getItem('refresh_token'),
      client_id: '1b7c6049734a4b7e9c3c8810aa715350',
    }),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.error) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        document.getElementById('auth').classList.remove('d-none');
        document.getElementById('app').classList.add('d-none');
      } else {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
      }
    });
}

document.getElementById('spotifySignOut').addEventListener('click', () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  window.location.reload();
});

async function playlistSelect() {
  document.getElementById('auth').classList.add('d-none');
  document.getElementById('app').classList.remove('d-none');
  document.getElementById('playlistSelectLoading').classList.remove('d-none');
  document.getElementById('spotifySignOut').classList.remove('d-none');

  await refresh();

  let playlistsFetch = await fetch(
    'https://api.spotify.com/v1/me/playlists?' +
      new URLSearchParams({
        limit: 50,
      }),
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`,
      },
    }
  );

  if (playlistsFetch.ok) {
    let playlists = await playlistsFetch.json();
    playlists.items.unshift({ id: 'Last', name: 'Last 50 Songs' });
    let playlistList = document.getElementById('playlistList');
    playlists.items.forEach((playlist) => {
      let playlistItem = document.createElement('button');
      playlistItem.classList.add('list-group-item');
      playlistItem.classList.add('list-group-item-action');
      playlistItem.setAttribute('type', 'button');
      playlistItem.setAttribute('id', 'playlist' + playlist.id);
      playlistItem.innerText = playlist.name;
      playlistList.appendChild(playlistItem);

      document.getElementById('playlistSelectLoading').classList.add('d-none');
      document.getElementById('playlistSelect').classList.remove('d-none');

      playlistItem.addEventListener('click', async (event) => {
        document.getElementById('gameSkipButton').innerText = 'Skip (+1s)';
        document.getElementById('playlistSelect').classList.add('d-none');
        document.getElementById('game').classList.remove('d-none');

        await refresh();

        let refreshTimeout = setTimeout(() => {
          document.getElementById('game').classList.add('d-none');
          document.getElementById('results').classList.remove('d-none');

          document.getElementById('resultsText').innerText =
            'Game timed out. Please try again.';
        }, 3600000);

        const playlistId = event.target.id.substring(8);

        let items = [];
        let itemsFetch = null;

        if (playlistId === 'Last') {
          let next =
            `https://api.spotify.com/v1/me/player/recently-played?` +
            new URLSearchParams({
              limit: 50,
            });

          for (let i = 0; i < 10 && next !== null; i++) {
            itemsFetch = await fetch(next, {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('access_token')}`,
              },
            });

            next = null;

            if (itemsFetch.ok) {
              let itemsTemp = await itemsFetch.json();

              next = itemsTemp.next;

              itemsTemp = itemsTemp.items;

              items.push(
                ...itemsTemp.filter((item) => item.track.duration_ms > 16000)
              );
            }
          }
        } else {
          let next =
            `https://api.spotify.com/v1/playlists/${playlistId}?` +
            new URLSearchParams({
              fields:
                'tracks(next,items(track(name,id,uri,duration_ms,artists(name))))',
            });

          while (next) {
            itemsFetch = await fetch(next, {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('access_token')}`,
              },
            });

            next = null;

            if (itemsFetch.ok) {
              let itemsTemp = await itemsFetch.json();
              if (itemsTemp.tracks) {
                itemsTemp = itemsTemp.tracks;
              }

              next = itemsTemp.next;

              itemsTemp = itemsTemp.items;

              items.push(
                ...itemsTemp.filter((item) => item.track.duration_ms > 16000)
              );
            }
          }
        }

        if (itemsFetch.ok && items.length > 0) {
          let track = items[Math.floor(Math.random() * items.length)];

          let tag = document.createElement('script');
          tag.src = 'https://sdk.scdn.co/spotify-player.js';
          document.getElementsByTagName('head')[0].appendChild(tag);

          window.onSpotifyWebPlaybackSDKReady = () => {
            const token = localStorage.getItem('access_token');
            const player = new Spotify.Player({
              name: 'Custom Heardle',
              getOAuthToken: (cb) => {
                cb(token);
              },
              volume: 0,
            });

            player.connect();

            player.addListener('ready', async ({ device_id }) => {
              let playerTrackFetch = await fetch(
                'https://api.spotify.com/v1/me/player/play?' +
                  new URLSearchParams({
                    device_id: device_id,
                  }),
                {
                  method: 'PUT',
                  body: JSON.stringify({
                    uris: [track.track.uri],
                  }),
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem(
                      'access_token'
                    )}`,
                  },
                }
              );

              if (playerTrackFetch.ok) {
                await player.pause();

                const answer = `${track.track.name} - ${track.track.artists[0].name}`;
                let guess = 0;
                let timeoutPlayer = null;

                document
                  .getElementById('playButton')
                  .addEventListener('click', async () => {
                    await player.seek(0);
                    await player.setVolume(0.5);

                    if (timeoutPlayer) {
                      clearTimeout(timeoutPlayer);
                    }

                    if (guess === 0) {
                      await player.resume();
                      scrub(0);
                      timeoutPlayer = setTimeout(async () => {
                        await player.pause();
                        await player.setVolume(0);
                      }, 1000);
                    }

                    if (guess === 1) {
                      await player.resume();
                      scrub(1);
                      timeoutPlayer = setTimeout(async () => {
                        await player.pause();
                        await player.setVolume(0);
                      }, 2000);
                    }

                    if (guess === 2) {
                      await player.resume();
                      scrub(2);
                      timeoutPlayer = setTimeout(async () => {
                        await player.pause();
                        await player.setVolume(0);
                      }, 4000);
                    }

                    if (guess === 3) {
                      await player.resume();
                      scrub(3);
                      timeoutPlayer = setTimeout(async () => {
                        await player.pause();
                        await player.setVolume(0);
                      }, 7000);
                    }

                    if (guess === 4) {
                      await player.resume();
                      scrub(4);
                      timeoutPlayer = setTimeout(async () => {
                        await player.pause();
                        await player.setVolume(0);
                      }, 11000);
                    }

                    if (guess === 5) {
                      await player.resume();
                      scrub(5);
                      timeoutPlayer = setTimeout(async () => {
                        await player.pause();
                        await player.setVolume(0);
                      }, 16000);
                    }
                  });

                async function attempt() {
                  const guessField =
                    document.getElementById('gameGuessField').value;
                  document.getElementById('gameGuessField').value = '';
                  await player.pause();
                  await player.setVolume(0);

                  if (scrubber) {
                    clearInterval(scrubber);
                  }

                  document.getElementById('gameTimestamp').innerText = '0:00';
                  document.getElementById('scrubberBar1').style.width = '0%';
                  document.getElementById('scrubberBar2').style.width = '0%';
                  document.getElementById('scrubberBar3').style.width = '0%';
                  document.getElementById('scrubberBar4').style.width = '0%';
                  document.getElementById('scrubberBar5').style.width = '0%';
                  document.getElementById('scrubberBar6').style.width = '0%';

                  guess++;

                  if (guess === 1) {
                    document.getElementById('gameSkipButton').innerText =
                      'Skip (+2s)';
                  }

                  if (guess === 2) {
                    document.getElementById('gameSkipButton').innerText =
                      'Skip (+3s)';
                  }

                  if (guess === 3) {
                    document.getElementById('gameSkipButton').innerText =
                      'Skip (+4s)';
                  }

                  if (guess === 4) {
                    document.getElementById('gameSkipButton').innerText =
                      'Skip (+5s)';
                  }

                  if (guess === 5) {
                    document.getElementById('gameSkipButton').innerText =
                      'Skip';
                  }

                  document.getElementById(`guess${guess}`).innerText =
                    guessField ? guessField : 'Skipped';

                  if (guess === 6 && guessField !== answer) {
                    guess++;
                  }

                  if (guess === 7 || guessField === answer) {
                    clearTimeout(refreshTimeout);

                    document.getElementById('game').classList.add('d-none');
                    document
                      .getElementById('results')
                      .classList.remove('d-none');

                    if (guess === 7) {
                      document.getElementById(
                        'resultsText'
                      ).innerText = `You lost! The answer was "${answer}"`;
                    } else {
                      document.getElementById(
                        'resultsText'
                      ).innerText = `You won! The answer was "${answer}"`;
                    }

                    document.getElementById(
                      'resultsEmbed'
                    ).innerHTML = `<iframe style="border-radius:12px" src="https://open.spotify.com/embed/track/${track.track.id}?utm_source=generator" width="100%" height="80" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>`;
                  }
                }

                document
                  .getElementById('gameGuessButton')
                  .addEventListener('click', attempt);

                document
                  .getElementById('gameSkipButton')
                  .addEventListener('click', () => {
                    document.getElementById('gameGuessField').value = '';
                    attempt();
                  });

                document
                  .getElementById('gameFooterLoading')
                  .classList.add('d-none');

                document
                  .getElementById('gameFooter')
                  .classList.remove('d-none');
              }
            });
          };
        } else {
          document.getElementById('playlistSelect').classList.add('d-none');
          document.getElementById('results').classList.remove('d-none');

          document.getElementById('resultsText').innerText =
            'Empty playlist! Please select a playlist with at least one track over 16 seconds.';
        }
      });
    });
  }
}

document.getElementById('playAgainButton').addEventListener('click', () => {
  window.location.reload();
});

let scrubber = null;

function scrub(section) {
  let time = 0;

  if (scrubber) {
    clearInterval(scrubber);
  }

  document.getElementById('gameTimestamp').innerText = '0:00';
  document.getElementById('scrubberBar1').style.width = '0%';
  document.getElementById('scrubberBar2').style.width = '0%';
  document.getElementById('scrubberBar3').style.width = '0%';
  document.getElementById('scrubberBar4').style.width = '0%';
  document.getElementById('scrubberBar5').style.width = '0%';
  document.getElementById('scrubberBar6').style.width = '0%';

  scrubber = setInterval(() => {
    time += 10;

    if (time % 1000 === 0) {
      document.getElementById('gameTimestamp').innerText = `0:${(
        time / 1000
      ).toLocaleString('en-US', {
        minimumIntegerDigits: 2,
        useGrouping: false,
      })}`;
    }

    if (time <= 1000) {
      document.getElementById('scrubberBar1').style.width = `${time / 10}%`;
    }
    if (time <= 2000) {
      document.getElementById('scrubberBar2').style.width = `${
        (time - 1000) / 10
      }%`;
    }
    if (time <= 4000) {
      document.getElementById('scrubberBar3').style.width = `${
        (time - 2000) / 20
      }%`;
    }
    if (time <= 7000) {
      document.getElementById('scrubberBar4').style.width = `${
        (time - 4000) / 30
      }%`;
    }
    if (time <= 11000) {
      document.getElementById('scrubberBar5').style.width = `${
        (time - 7000) / 40
      }%`;
    }
    if (time <= 16000) {
      document.getElementById('scrubberBar6').style.width = `${
        (time - 11000) / 50
      }%`;
    }

    if (
      (time === 1000 && section === 0) ||
      (time === 2000 && section === 1) ||
      (time === 4000 && section === 2) ||
      (time === 7000 && section === 3) ||
      (time === 11000 && section === 4) ||
      (time === 16000 && section === 5)
    ) {
      clearInterval(scrubber);

      document.getElementById('gameTimestamp').innerText = '0:00';
      document.getElementById('scrubberBar1').style.width = '0%';
      document.getElementById('scrubberBar2').style.width = '0%';
      document.getElementById('scrubberBar3').style.width = '0%';
      document.getElementById('scrubberBar4').style.width = '0%';
      document.getElementById('scrubberBar5').style.width = '0%';
      document.getElementById('scrubberBar6').style.width = '0%';
    }
  }, 10);
}

let timeout = null;

$('#gameGuessField').autocomplete({
  orientation: 'top',
  lookup: async (query, done) => {
    if (timeout) {
      clearTimeout(timeout);
      done({ suggestions: [] });
    }

    if (query !== '') {
      timeout = setTimeout(async () => {
        let searchFetch = await fetch(
          'https://api.spotify.com/v1/search?' +
            new URLSearchParams({
              q: query,
              type: 'track',
            }),
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('access_token')}`,
            },
          }
        );

        if (searchFetch.ok) {
          let search = await searchFetch.json();

          data = [];

          search.tracks.items.forEach((track) => {
            data.push(`${track.name} - ${track.artists[0].name}`);
          });

          data = [...new Set(data)];

          let dataObj = { suggestions: [] };

          data.forEach((track) => {
            dataObj.suggestions.push({ value: track, data: track });
          });

          done(dataObj);
        }
      }, 500);
    }
  },
});
