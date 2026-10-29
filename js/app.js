function app() {
  return {
    view: "catalogo",
    films: [],
    q: "",
    cat: "Todas",
    sort: "title",
    cart: [],
    rentals: [],
    sel: null,
    loading: true,
    store: "1",
    customer: "",
    toast: "",
    team: [
      { n: "Valeria Rodriguez", r: "Frontend" },
      { n: "Jorge Soliz", r: "Backend y API" },
      { n: "Wara Tipola", r: "Base de datos" }
    ],

    async init() {
      try {
        const s = localStorage.getItem("sakila_rentals");
        if (s) this.rentals = JSON.parse(s);
      } catch (e) {}
      await this.load();
    },

    async load() {
      try {
        if (!API_URL) throw new Error("sin API");
        const r = await fetch(API_URL + "/films");
        if (!r.ok) throw new Error(r.status);
        this.films = await r.json();
      } catch (e) {
        this.films = LOCAL;
      }
      this.loading = false;
    },

    get cats() {
      return [...new Set(this.films.map(f => f.cat))].sort();
    },

    get filtered() {
      const q = this.q.toLowerCase();
      return this.films
        .filter(f => (this.cat === "Todas" || f.cat === this.cat) &&
          (!q || f.title.toLowerCase().includes(q) || f.actors.join(" ").toLowerCase().includes(q)))
        .sort((a, b) => this.sort === "title" ? a.title.localeCompare(b.title) : a[this.sort] - b[this.sort]);
    },

    get total() {
      return this.cart.reduce((s, f) => s + f.rate, 0);
    },

    poster(f) {
      const h = (f.id * 47) % 360;
      return "background:linear-gradient(135deg,hsl(" + h + ",60%,45%),hsl(" + ((h + 60) % 360) + ",60%,30%))";
    },

    add(f) {
      if (this.cart.find(c => c.id === f.id)) { this.say("Ya esta en el carrito"); return; }
      this.cart.push(f);
      this.sel = null;
      this.say("Agregada: " + f.title);
    },

    checkout() {
      const now = Date.now();
      this.cart.forEach(f => {
        const due = new Date(now + f.days * 86400000).toLocaleDateString("es-BO");
        this.rentals.unshift({ id: now + f.id, title: f.title, rate: f.rate, store: this.store, customer: this.customer || "Cliente", due });
      });
      this.cart = [];
      this.save();
      this.view = "historial";
      this.say("Alquiler confirmado");
    },

    save() {
      try { localStorage.setItem("sakila_rentals", JSON.stringify(this.rentals)); } catch (e) {}
    },

    say(t) {
      this.toast = t;
      setTimeout(() => this.toast = "", 2000);
    }
  };
}
