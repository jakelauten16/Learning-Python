/* ==========================================================================
   Menu page — renders MENU, seasonal group pinned to the top.
   The chips jump to a group rather than filtering, so nothing ever
   disappears on someone who is scanning for one specific drink.
   ========================================================================== */

/** Seasonal first, then the order it's written in data.js. */
function orderedGroups() {
  return [...MENU].sort((a, b) => (b.season === true) - (a.season === true));
}

function itemRow(item) {
  const soldOut = item.available === false;
  return `
    <li class="menu-item">
      <span class="menu-item-name">
        ${escapeHTML(item.name)}
        ${item.temp ? `<span class="menu-item-temp">${escapeHTML(item.temp)}</span>` : ''}
        ${soldOut ? '<span class="menu-item-temp">Off the board</span>' : ''}
      </span>
      <span class="menu-item-price">${money(item.price)}</span>
      <span class="menu-item-desc">${escapeHTML(item.desc)}</span>
    </li>`;
}

function groupBlock(group) {
  const seasonal = group.season === true;
  return `
    <section class="menu-group ${seasonal ? 'menu-group-seasonal' : ''}" id="group-${group.id}">
      <div class="menu-group-head">
        <h2 class="menu-group-title">${escapeHTML(group.name)}</h2>
        ${seasonal ? '<span class="tag tag-seasonal">Seasonal</span>' : ''}
        ${group.accent === 'lotus' ? '<span class="tag tag-lotus">Caffeine, no coffee</span>' : ''}
        ${group.note ? `<span class="menu-group-note">${escapeHTML(group.note)}</span>` : ''}
      </div>
      ${seasonal && group.window ? `
        <div class="seasonal-banner">
          <p class="seasonal-banner-text">
            <strong>${escapeHTML(group.window)}.</strong>
            These four come off the board when the season turns. If you want one, this is the window.
          </p>
          <a class="btn" href="preorder.html">Preorder a seasonal</a>
        </div>` : ''}
      <ul class="menu-items">${group.items.map(itemRow).join('')}</ul>
    </section>`;
}

function initMenu() {
  const root = document.getElementById('menu-groups');
  if (!root) return;

  const groups = orderedGroups();
  root.innerHTML = groups.map(groupBlock).join('');

  const nav = document.getElementById('menu-nav');
  if (nav) {
    nav.innerHTML = groups.map((g) => `
      <a class="menu-chip" href="#group-${g.id}">${escapeHTML(g.name)}</a>
    `).join('');
  }
}

document.addEventListener('DOMContentLoaded', initMenu);
