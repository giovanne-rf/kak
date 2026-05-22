import {
  ArrowLeft,
  Building2,
  Camera,
  CircuitBoard,
  DoorOpen,
  Eye,
  Mail,
  Menu,
  Plus,
  Save,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api, assetUrl } from "./api";

const equipmentTypes = ["Câmera", "Sensor de presença", "Leitor facial", "TAG"];
const roleLabels = {
  admin: "Admin",
  viewer: "Viewer",
};

function formatPhone(value) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Login({ onLogin }) {
  const [form, setForm] = useState({ username: "admin", password: "Admin@123" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await api.login(form);
      localStorage.setItem("condotech_token", data.access_token);
      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-panel" aria-label="Login">
        <div className="brand-lockup">
          <span className="brand-mark">CT</span>
          <div>
            <strong>CondoTech</strong>
            <small>Gestao de dispositivos</small>
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <h1>Acesso restrito</h1>
          <Field label="Usuario">
            <input
              autoComplete="username"
              value={form.username}
              onChange={(event) => setForm({ ...form, username: event.target.value })}
              required
            />
          </Field>
          <Field label="Senha">
            <input
              autoComplete="current-password"
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              required
            />
          </Field>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button" type="submit" disabled={loading}>
            <ShieldCheck size={18} />
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}

function TopChrome({ activeView, setActiveView, user, onLogout, buildings, onSelectBuilding, canEdit }) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const menuItems = [
    { id: "dashboard", label: "Principal" },
    ...(canEdit
      ? [
          { id: "buildings", label: "Cadastrar edificio" },
          { id: "users", label: "Cadastrar usuario" },
          { id: "equipments", label: "Cadastrar equipamento" },
        ]
      : []),
  ];

  const suggestions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];
    return buildings
      .filter((building) => building.name.toLowerCase().includes(term))
      .slice(0, 6);
  }, [buildings, searchTerm]);

  useEffect(() => {
    if (activeView === "buildingDetail") {
      setSearchTerm("");
    }
  }, [activeView]);

  function selectView(id) {
    setActiveView(id);
    setOpen(false);
  }

  function selectBuilding(building) {
    setSearchTerm("");
    onSelectBuilding(building);
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    if (suggestions.length > 0) {
      selectBuilding(suggestions[0]);
    }
  }

  return (
    <header className="site-header">
      <div className="black-bar">
        <span>CONDOMINIOS</span>
        <span>DISPOSITIVOS</span>
        <span>MONITORAMENTO</span>
        <span>RELATORIOS</span>
        <span className="spacer" />
        <span>SAC</span>
        <span className="top-action">
          <Mail size={17} />
          EMAIL
        </span>
        <span>{user?.name}</span>
        <span>{roleLabels[user?.role] || ""}</span>
        <button className="subscribe-button" onClick={onLogout} title="Sair">
          <DoorOpen size={16} />
          Sair
        </button>
      </div>

      <div className="masthead">
        <button className="mobile-menu" onClick={() => setOpen(true)} title="Abrir menu">
          <Menu size={22} />
        </button>
        <div className="logo">
          <span className="logo-number">360</span>
          <span className="logo-word">condo</span>
          <small>TECNOLOGIA</small>
        </div>
        <button className="mail-button" title="Mensagens">
          <Mail size={20} />
          EMAIL
        </button>
        <div className="market-strip">
          <strong>Online</strong>
          <span>Edificios</span>
          <b>Ativo</b>
        </div>
        <div className="weather-chip">
          <Building2 size={21} />
          <div>
            <strong>Fortaleza</strong>
            <span>Operacao local</span>
          </div>
        </div>
        <form className="search-box" onSubmit={handleSearchSubmit}>
          <Search size={20} />
          <input
            placeholder="Buscar condominio"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          {suggestions.length > 0 && (
            <div className="search-suggestions">
              {suggestions.map((building) => (
                <button type="button" key={building.id} onClick={() => selectBuilding(building)}>
                  <strong>{building.name}</strong>
                  <span>{building.address}</span>
                </button>
              ))}
            </div>
          )}
        </form>
      </div>

      <nav className={`nav-row ${open ? "is-open" : ""}`}>
        <button className="close-menu" onClick={() => setOpen(false)} title="Fechar menu">
          <X size={22} />
        </button>
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={activeView === item.id ? "active" : ""}
            onClick={() => selectView(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </header>
  );
}

function Dashboard({ dashboard, equipments, setActiveView, onSelectBuilding, canEdit }) {
  const latestEquipment = equipments.slice(0, 5);

  return (
    <section className="content-grid">
      <div className="ad-band">
        <div>
          <span>GESTAO INTEGRADA</span>
          <h1>Dispositivos eletronicos por edificio</h1>
          <p>Controle predial, acesso, sensores e cameras em uma unica operacao.</p>
        </div>
        <div className="band-stats">
          <strong>{dashboard?.totals?.buildings || 0}</strong>
          <span>edificios</span>
          <strong>{dashboard?.totals?.equipments || 0}</strong>
          <span>equipamentos</span>
        </div>
      </div>

      <div className="summary-grid">
        <MetricCard icon={<Building2 />} label="Edificios" value={dashboard?.totals?.buildings || 0} />
        <MetricCard icon={<CircuitBoard />} label="Equipamentos" value={dashboard?.totals?.equipments || 0} />
        <MetricCard icon={<Users />} label="Usuarios" value={dashboard?.totals?.users || 0} />
      </div>

      {canEdit && (
        <div className="quick-actions">
          <ActionCard icon={<Building2 />} label="Cadastrar edificio" onClick={() => setActiveView("buildings")} />
          <ActionCard icon={<UserPlus />} label="Cadastrar usuario" onClick={() => setActiveView("users")} />
          <ActionCard icon={<Camera />} label="Cadastrar equipamento" onClick={() => setActiveView("equipments")} />
        </div>
      )}

      <section className="panel">
        <div className="panel-title">
          <h2>Edificios cadastrados</h2>
        </div>
        <div className="building-list">
          {(dashboard?.buildings || []).map((building) => (
            <button className="building-card" type="button" key={building.id} onClick={() => onSelectBuilding(building)}>
              {building.photo_url ? (
                <img src={assetUrl(building.photo_url)} alt={building.name} />
              ) : (
                <div className="image-placeholder">
                  <Building2 size={32} />
                </div>
              )}
              <div>
                <strong>{building.name}</strong>
                <span>{building.address}</span>
                <small>
                  {building.manager_name} | {building.manager_phone}
                </small>
              </div>
              <b>{building.equipment_count} itens</b>
            </button>
          ))}
          {dashboard?.buildings?.length === 0 && <p className="empty">Nenhum edificio cadastrado.</p>}
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          <h2>Equipamentos recentes</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Edificio</th>
                <th>Local</th>
                <th>IP</th>
                <th>Modelo</th>
              </tr>
            </thead>
            <tbody>
              {latestEquipment.map((equipment) => (
                <tr key={equipment.id}>
                  <td>{equipment.equipment_type}</td>
                  <td>{equipment.building_name}</td>
                  <td>{equipment.installation_location}</td>
                  <td>{equipment.ip}</td>
                  <td>{equipment.model}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {latestEquipment.length === 0 && <p className="empty">Nenhum equipamento cadastrado.</p>}
        </div>
      </section>
    </section>
  );
}

function BuildingDetail({ building, equipments, onBack }) {
  const [typeFilter, setTypeFilter] = useState("Todos");

  if (!building) {
    return (
      <section className="panel">
        <button className="ghost-button" type="button" onClick={onBack}>
          <ArrowLeft size={18} />
          Voltar
        </button>
        <p className="empty">Condominio nao encontrado.</p>
      </section>
    );
  }

  const buildingEquipments = equipments.filter((equipment) => equipment.building_id === building.id);
  const filteredEquipments =
    typeFilter === "Todos"
      ? buildingEquipments
      : buildingEquipments.filter((equipment) => equipment.equipment_type === typeFilter);

  return (
    <section className="content-grid">
      <section className="detail-header">
        <button className="ghost-button" type="button" onClick={onBack}>
          <ArrowLeft size={18} />
          Voltar
        </button>
        <div className="detail-card">
          {building.photo_url ? (
            <img src={assetUrl(building.photo_url)} alt={building.name} />
          ) : (
            <div className="detail-placeholder">
              <Building2 size={42} />
            </div>
          )}
          <div>
            <h1>{building.name}</h1>
            <p>{building.address}</p>
            <span>
              {building.manager_name} | {building.manager_phone}
            </span>
          </div>
          <strong>{buildingEquipments.length} dispositivos</strong>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title filter-title">
          <h2>Dispositivos cadastrados</h2>
          <label className="inline-filter">
            <span>Tipo</span>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              <option>Todos</option>
              {equipmentTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Fabricante</th>
                <th>Modelo</th>
                <th>IP</th>
                <th>Local</th>
                <th>Login</th>
              </tr>
            </thead>
            <tbody>
              {filteredEquipments.map((equipment) => (
                <tr key={equipment.id}>
                  <td>{equipment.equipment_type}</td>
                  <td>{equipment.manufacturer}</td>
                  <td>{equipment.model}</td>
                  <td>{equipment.ip}</td>
                  <td>{equipment.installation_location}</td>
                  <td>{equipment.access_login}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredEquipments.length === 0 && <p className="empty">Nenhum dispositivo encontrado.</p>}
        </div>
      </section>
    </section>
  );
}

function MetricCard({ icon, label, value }) {
  return (
    <article className="metric-card">
      <span>{icon}</span>
      <div>
        <strong>{value}</strong>
        <small>{label}</small>
      </div>
    </article>
  );
}

function ActionCard({ icon, label, onClick }) {
  return (
    <button className="action-card" onClick={onClick}>
      <span>{icon}</span>
      <strong>{label}</strong>
      <Plus size={18} />
    </button>
  );
}

function BuildingForm({ onCreated }) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState("");
  const [managerPhone, setManagerPhone] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setSaving(true);
    setMessage("");
    try {
      await api.createBuilding(formData);
      form.reset();
      setPreview("");
      setManagerPhone("");
      setMessage("Edificio cadastrado.");
      onCreated();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormPanel title="Cadastrar edificio" icon={<Building2 />}>
      <form className="data-form" onSubmit={handleSubmit}>
        <Field label="Nome">
          <input name="name" required />
        </Field>
        <Field label="Endereco">
          <textarea name="address" rows="3" required />
        </Field>
        <div className="split">
          <Field label="Nome do sindico">
            <input name="manager_name" required />
          </Field>
          <Field label="Telefone">
            <input
              inputMode="tel"
              name="manager_phone"
              pattern={String.raw`\([0-9]{2}\) [0-9]{4,5}-[0-9]{4}`}
              placeholder="(85) 99999-9999"
              title="Informe DDD e telefone. Exemplo: (85) 99999-9999"
              value={managerPhone}
              onChange={(event) => setManagerPhone(formatPhone(event.target.value))}
              required
            />
          </Field>
        </div>
        <Field label="Foto">
          <input
            accept=".jpg,.jpeg,.png,.webp"
            name="photo"
            type="file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              setPreview(file ? URL.createObjectURL(file) : "");
            }}
          />
        </Field>
        {preview && <img className="preview-image" src={preview} alt="Previa do edificio" />}
        <SubmitButton saving={saving} />
        {message && <p className="form-message">{message}</p>}
      </form>
    </FormPanel>
  );
}

function UserForm({ onCreated, users }) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    setSaving(true);
    setMessage("");
    try {
      await api.createUser(payload);
      form.reset();
      setMessage("Usuario cadastrado.");
      onCreated();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormPanel title="Cadastrar usuario" icon={<UserPlus />}>
      <form className="data-form" onSubmit={handleSubmit}>
        <Field label="Nome">
          <input name="name" required />
        </Field>
        <div className="split">
          <Field label="Usuario">
            <input name="username" required />
          </Field>
          <Field label="Email">
            <input name="email" type="email" required />
          </Field>
        </div>
        <Field label="Senha">
          <input name="password" type="password" minLength="6" required />
        </Field>
        <Field label="Tipo">
          <select name="role" defaultValue="viewer" required>
            <option value="admin">Admin</option>
            <option value="viewer">Viewer</option>
          </select>
        </Field>
        <SubmitButton saving={saving} />
        {message && <p className="form-message">{message}</p>}
      </form>

      <div className="compact-list">
        {users.map((user) => (
          <div key={user.id}>
            <strong>{user.name}</strong>
            <span>{user.username}</span>
            <small>{user.email}</small>
            <b>{roleLabels[user.role] || user.role}</b>
          </div>
        ))}
      </div>
    </FormPanel>
  );
}

function EquipmentForm({ buildings, equipments, onCreated }) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    payload.building_id = Number(payload.building_id);
    setSaving(true);
    setMessage("");
    try {
      await api.createEquipment(payload);
      form.reset();
      setMessage("Equipamento cadastrado.");
      onCreated();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormPanel title="Cadastrar equipamento" icon={<CircuitBoard />}>
      <form className="data-form" onSubmit={handleSubmit}>
        <Field label="Edificio">
          <select name="building_id" required defaultValue="">
            <option value="" disabled>
              Selecione
            </option>
            {buildings.map((building) => (
              <option key={building.id} value={building.id}>
                {building.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="split">
          <Field label="Tipo">
            <select name="equipment_type" required defaultValue="">
              <option value="" disabled>
                Selecione
              </option>
              {equipmentTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fabricante">
            <input name="manufacturer" required />
          </Field>
        </div>
        <div className="split">
          <Field label="Modelo">
            <input name="model" required />
          </Field>
          <Field label="IP">
            <input name="ip" placeholder="192.168.0.10" required />
          </Field>
        </div>
        <Field label="Local da instalacao">
          <input name="installation_location" required />
        </Field>
        <div className="split">
          <Field label="Login">
            <input name="access_login" required />
          </Field>
          <Field label="Senha">
            <input name="access_password" type="password" required />
          </Field>
        </div>
        <SubmitButton saving={saving} />
        {message && <p className="form-message">{message}</p>}
      </form>

      <div className="table-wrap compact-table">
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Edificio</th>
              <th>IP</th>
              <th>Local</th>
            </tr>
          </thead>
          <tbody>
            {equipments.map((equipment) => (
              <tr key={equipment.id}>
                <td>{equipment.equipment_type}</td>
                <td>{equipment.building_name}</td>
                <td>{equipment.ip}</td>
                <td>{equipment.installation_location}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </FormPanel>
  );
}

function FormPanel({ title, icon, children }) {
  return (
    <section className="form-shell">
      <div className="panel-title">
        <span>{icon}</span>
        <h1>{title}</h1>
      </div>
      {children}
    </section>
  );
}

function ReadOnlyNotice() {
  return (
    <section className="form-shell readonly-panel">
      <div className="panel-title">
        <span>
          <Eye />
        </span>
        <h1>Acesso viewer</h1>
      </div>
      <p>Este usuario pode visualizar os condominios e dispositivos, mas nao pode cadastrar ou alterar dados.</p>
    </section>
  );
}

function SubmitButton({ saving }) {
  return (
    <button className="primary-button save-button" type="submit" disabled={saving}>
      <Save size={18} />
      {saving ? "Salvando..." : "Salvar"}
    </button>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [activeView, setActiveView] = useState("dashboard");
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [buildings, setBuildings] = useState([]);
  const [users, setUsers] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem("condotech_token")));
  const [error, setError] = useState("");
  const canEdit = user?.role === "admin";
  const selectedBuilding = buildings.find((building) => building.id === selectedBuildingId);

  const viewTitle = useMemo(
    () =>
      ({
        dashboard: "Principal",
        buildings: "Cadastrar edificio",
        users: "Cadastrar usuario",
        equipments: "Cadastrar equipamento",
        buildingDetail: selectedBuilding?.name || "Condominio",
      })[activeView],
    [activeView, selectedBuilding?.name]
  );

  async function loadData() {
    setError("");
    const [dashboardData, buildingsData, usersData, equipmentsData] = await Promise.all([
      api.dashboard(),
      api.listBuildings(),
      api.listUsers(),
      api.listEquipments(),
    ]);
    setDashboard(dashboardData);
    setBuildings(buildingsData);
    setUsers(usersData);
    setEquipments(equipmentsData);
  }

  useEffect(() => {
    async function boot() {
      const token = localStorage.getItem("condotech_token");
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const currentUser = await api.me();
        await loadData();
        setUser(currentUser);
      } catch {
        localStorage.removeItem("condotech_token");
      } finally {
        setLoading(false);
      }
    }
    boot();
  }, []);

  async function handleLogin(nextUser) {
    setUser(nextUser);
    setLoading(true);
    try {
      await loadData();
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("condotech_token");
    setUser(null);
  }

  function navigate(view) {
    if (view !== "buildingDetail") {
      setSelectedBuildingId(null);
    }
    setActiveView(view);
  }

  function selectBuilding(building) {
    setSelectedBuildingId(building.id);
    setActiveView("buildingDetail");
  }

  if (!user && !loading) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app-shell">
      <TopChrome
        activeView={activeView}
        setActiveView={navigate}
        user={user}
        onLogout={logout}
        buildings={buildings}
        onSelectBuilding={selectBuilding}
        canEdit={canEdit}
      />
      <main className="main-area" aria-label={viewTitle}>
        {loading && <p className="loading">Carregando...</p>}
        {error && <p className="form-error">{error}</p>}
        {!loading && activeView === "dashboard" && (
          <Dashboard
            dashboard={dashboard}
            equipments={equipments}
            setActiveView={navigate}
            onSelectBuilding={selectBuilding}
            canEdit={canEdit}
          />
        )}
        {!loading && activeView === "buildingDetail" && (
          <BuildingDetail
            building={selectedBuilding}
            equipments={equipments}
            onBack={() => navigate("dashboard")}
          />
        )}
        {!loading && canEdit && activeView === "buildings" && <BuildingForm onCreated={loadData} />}
        {!loading && canEdit && activeView === "users" && <UserForm users={users} onCreated={loadData} />}
        {!loading && canEdit && activeView === "equipments" && (
          <EquipmentForm buildings={buildings} equipments={equipments} onCreated={loadData} />
        )}
        {!loading && !canEdit && ["buildings", "users", "equipments"].includes(activeView) && <ReadOnlyNotice />}
      </main>
    </div>
  );
}
