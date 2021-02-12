import { RtagClient } from "./client";
import * as Types from "./types";
import Vue from "vue";
import VueRouter from "vue-router";
import Toasted from "vue-toasted";
import vSelect from "vue-select";

Vue.use(VueRouter);
Vue.use(Toasted, { position: "top-center", duration: 2000 });
Vue.component("v-select", vSelect);


function patch(obj: any, val: any, topLevel: boolean = true) {
  const [k, v] = Object.entries(val)[0];
  if (v !== null && typeof v === "object" && !Array.isArray(v) && k in obj) {
    patch(obj[k], v, false);
  } else {
    Vue.set(obj, k, v);
  }
}

Vue.component("method-form", {
  props: { method: String },
  data: () => ({ value: {}, showErrors: false }),
  template: `<div class="form" :id="method">
      <h1 class="heading">{{method}}</h1>
      <slot :arg="method" :value="value" :showErrors="showErrors"></slot>
      <button type="button" class="button submit" @click="submit">
        <span class="button-text">Submit</span>
      </button>
    </div>`,
  created() {
    this.$on("update", (arg: string, value: any) => {
      patch(this.value, value);
    });
  },
  methods: {
    submit() {
      if (!(this.$children[0] as any).validate()) {
        this.$toasted.error("Required fields missing");
        this.showErrors = true;
        return;
      }
      const client: RtagClient = this.$parent.$data.client;
      client[this.method as keyof RtagClient](this.value as any, (error) => {
        if (error) {
          this.$toasted.error(error);
        } else {
          this.showErrors = false;
          this.value = {};
        }
      });
    },
  },
});

Vue.component("object-input", {
  props: { arg: String, required: Boolean, value: { type: Object, default: () => ({}) } },
  template: `<div><slot :value="value"></slot></div>`,
  created() {
    this.$on("update", (arg: number, value: any) => {
      this.$parent.$emit("update", this.arg, { [arg]: value });
    });
  },
  methods: {
    validate() {
      return this.$children.every((child: any) => child.validate());
    },
  },
});

Vue.component("array-input", {
  props: { arg: String, required: Boolean, showErrors: Boolean, value: { type: Array, default: () => [] } },
  template: `<div>
      <div class="form-group array-item" v-for="(v, i) in value">
        <div class="stretch-form-input">
          <slot :arg="i.toString()" :value="v"></slot>
        </div>
        <button class="button" type="button" @click="$parent.$emit('update', arg, i === 0 ? value : [...value.slice(0, i-1), value[i], value[i-1], ...value.slice(i+1, value.length)])">&#8593;</button>
        <button class="button" type="button" @click="$parent.$emit('update', arg, i === (value.length-1) ? value : [...value.slice(0, i), value[i+1], value[i], ...value.slice(i+2, value.length)])">&#8595;</button>
        <button class="button danger" type="button" @click="$parent.$emit('update', arg, value.slice(0, i).concat(value.slice(i+1, value.length)))">x</button>
      </div>
      <button class="button" type="button" @click="$parent.$emit('update', arg, value.concat(null))" :class="{ missing: showErrors && required && value.length === 0 }">
        <span class="button-text">Add</span>
      </button>
    </div>`,
  created() {
    this.$on("update", (arg: string, value: any) => {
      this.$parent.$emit("update", this.arg, Object.assign([], this.value, { [Number(arg)]: value }));
    });
  },
  methods: {
    validate() {
      return this.$children.every((child: any) => child.validate()) && (!this.required || this.value.length > 0);
    },
  },
});

Vue.component("enum-input", {
  props: {
    arg: String,
    required: Boolean,
    showErrors: Boolean,
    value: { type: Number, default: null },
    enum: String,
  },
  template: `<div  class="vue-select" :class="{ missing: showErrors && !validate() }">
      <v-select :value="value" :options="options" :reduce="x => x.value" @input="update"></v-select>
    </div>`,
  methods: {
    update(value: string) {
      this.$parent.$emit("update", this.arg, value === null ? null : Number(value));
    },
    validate() {
      return !this.required || this.value !== null;
    },
  },
  computed: {
    options() {
      return Object.entries(Types[this.enum as keyof typeof Types])
        .filter(([_, value]) => typeof value == "number")
        .map(([label, value]) => ({ label, value }));
    },
  },
});

Vue.component("string-input", {
  props: { arg: String, required: Boolean, showErrors: Boolean, value: { type: String, default: null } },
  template: `<div class="input-group" :class="{ missing: showErrors && !validate() }">
      <input class="input" type="text" :value="value" @input="update($event.target.value)" />
    </div>`,
  methods: {
    update(value: string) {
      this.$parent.$emit("update", this.arg, value === "" ? null : value);
    },
    validate() {
      return !this.required || this.value !== null;
    },
  },
});

Vue.component("number-input", {
  props: { arg: String, required: Boolean, showErrors: Boolean, value: { type: Number, default: null } },
  template: `<div class="input-group" :class="{ missing: showErrors && !validate() }">
      <input class="input" type="number" :value="value" @input="update($event.target.value)" />
    </div>`,
  methods: {
    update(value: string) {
      this.$parent.$emit("update", this.arg, value === "" ? null : Number(value));
    },
    validate() {
      return !this.required || this.value !== null;
    },
  },
});

Vue.component("object-display", {
  props: { value: Object },
  template: `<div><slot v-if="value != undefined" :value="value"></slot></div>`,
});

Vue.component("array-display", {
  data: () => ({ isOpen: true }),
  props: { value: Array },
  template: `<span v-if="value != undefined && value.length > 0">
      <button class="button small" type="button" v-on:click="isOpen=!isOpen">
        <span class="button-text" v-if="isOpen">-</span>
        <span class="button-text" v-else>+</span>
      </button>
      <span v-if="!isOpen">...</span>
      <div v-else v-for="v in value">
        <slot :value="v"></slot>
      </div>
    </span>`,
});

Vue.component("enum-display", {
  props: { value: Number, enum: String },
  template: `<span v-if="value != undefined">{{options[value].label}}</span>`,
  computed: {
    options() {
      return Object.entries(Types[this.enum as keyof typeof Types])
        .filter(([_, value]) => typeof value == "number")
        .map(([label, value]) => ({ label, value }));
    },
  },
});

Vue.component("string-display", {
  props: { value: String },
  template: `<span>"{{value}}"</span>`,
});

Vue.component("number-display", {
  props: { value: Number },
  template: `<span>{{value}}</span>`,
});

Vue.component("boolean-display", {
  props: { value: Boolean },
  template: `<span>{{value}}</span>`,
});

Vue.component("key-display", {
  props: { value: String, typeString: String },
  data: () => ({ hover: false }),
  template: `<span>
      <span class="key-display" @mouseover="hover=true" @mouseleave="hover=false">
        {{value}}:
      </span>
      <span v-if="hover">({{typeString}})</span>
    </span>`,
});

Vue.component("plugin-display", {
  props: ["value", "component"],
  render(createElement) {
    const rootData = this.$root.$children[0].$data;
    return createElement(this.component, {
      domProps: {
        val: this.value,
        state: rootData.value,
        client: rootData.client,
      },
      on: {
        error: (e: CustomEvent) => this.$toasted.error(e.detail),
      },
    });
  },
});

const Login = Vue.component("login", {
  data: () => ({ username: "" }),
  template: `<form @submit.prevent="handleLogin">
      <label class="label">
        Username
        <div class="input-group">
          <input class="input" v-model="username" type="text" />
        </div>
      </label>
      <button type="submit" class="button submit">
        <span class="button-text">Submit</span>
      </button>
    </form>`,
  methods: {
    handleLogin() {
      RtagClient.registerUser(this.username).then((token) => {
        sessionStorage.setItem("user", JSON.stringify({ name: this.username, token }));
        const url = this.$route.query.url;
        this.$router.push((Array.isArray(url) ? url[0] : url) || "/");
      });
    },
  },
});

const Home = Vue.component("home", {
  data: () => ({ stateId: "" }),
  template: "#home-template",
  methods: {
    createState() {
      const token = JSON.parse(sessionStorage.getItem("user")!).token;
      RtagClient.createState(token, {}).then((stateId) => {
        this.$router.push("/state/" + stateId);
      });
    },
    joinState() {
      this.$router.push("/state/" + this.stateId);
    },
  },
});

const State = Vue.component("state", {
  data: () => ({ value: {}, client: {} }),
  template: "#state-template",
  created() {
    const token = JSON.parse(sessionStorage.getItem("user")!).token;
    RtagClient.connect(location.host, token, this.$route.params.stateId, (state) => {
      this.value = state;
    })
      .then((client) => {
        this.client = client;
      })
      .catch(() => {
        this.$toasted.error("Error during connection");
      });
  },
});

const router = new VueRouter({
  mode: "history",
  routes: [
    { path: "/login", component: Login },
    { path: "/", component: Home },
    { path: "/state/:stateId", component: State },
  ],
});

router.beforeEach((to, from, next) => {
  if (to.path != "/login" && sessionStorage.getItem("user") == null) {
    next(`/login${to.path === "/" ? "" : "?url=" + to.path}`);
  } else {
    next();
  }
});

new Vue({
  el: "#app",
  router,
});
