
import htmlFiles from './sandbox/sandbox.json';

class ListSandBox extends HTMLDetailsElement  {
    constructor() {
      super();
      this.open = true;
      // Отображение файлов с датой
      this.innerHTML = `<summary>SandBox list</summary>
      <ul><li>
      ${htmlFiles.map(file => {
        const link = `./sandbox/${file.name}`;
        return `<a href="${link}">${new Date(file.mtime).toLocaleString()} - ${file.name}</a>`;
      }).join('</li>\n<li>')}
      </li></ul>
      `;
  }
}

customElements.define("og-sandbox", ListSandBox, { extends: 'details' }); // Define the new element

export default ListSandBox;
