/**
 * BrokerDashboardScreen.tsx
 *
 * Reads the logged-in broker straight from BrokerContext — no route
 * params needed. Works identically whether you arrived here from a
 * fresh BrokerLoginScreen submit, or from the app auto-restoring a
 * saved session on launch (see BrokerContext's useEffect).
 *
 * Parties linked to this broker (Party.agent -> Agent.serialNo) are
 * shown directly here, with a search bar filtering by name/phone/GST.
 * Same fetch-once-filter-client-side strategy as the old standalone
 * BrokerPartiesScreen — fine for tens/low-hundreds of parties per
 * broker. If a broker's book grows into the thousands, swap the
 * client-side filter for a debounced call to
 * partyApi.getByAgent(serialNo, search).
 *
 * Register in your Broker navigator:
 *   <Stack.Screen name="BrokerDashboard" component={BrokerDashboardScreen} />
 */

import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { BrokerContext } from '../context/BrokerContext';
import { partyApi, PartyDto } from '../api/api';

export default function BrokerDashboardScreen({ navigation }: any) {
  const { broker, logoutBroker } = useContext(BrokerContext);

  const [parties, setParties]       = useState<PartyDto[]>([]);
  const [query, setQuery]           = useState('');
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState('');

  const fetchParties = async (isRefresh = false) => {
    if (!broker?.serialNo) return;
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const res = await partyApi.getByAgent(broker.serialNo);
      setParties(res.data ?? []);
    } catch {
      setError('Could not load parties. Pull down to retry.');
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  };

  useEffect(() => {
    fetchParties();
  }, [broker?.serialNo]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return parties;
    return parties.filter(p =>
      p.partyName?.toLowerCase().includes(q) ||
      p.mobileNo?.includes(q) ||
      p.gstNo?.toLowerCase().includes(q)
    );
  }, [parties, query]);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logoutBroker();
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  };

  return (
    <View style={s.screen}>
      {/* Header */}
      <LinearGradient colors={['#b45309', '#d97706', '#f59e0b']} style={s.header}>
        <View style={s.headerTop}>
          <View>
            <Text style={s.greeting}>Welcome back,</Text>
            <Text style={s.brokerName}>{broker?.agentName ?? 'Broker'}</Text>
            <Text style={s.brokerPhone}>+91 {broker?.contactNo} · {broker?.serialNo}</Text>
          </View>
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
            <Text style={s.logoutTxt}>Logout</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Search bar */}
      <View style={s.searchWrap}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          style={s.searchInput}
          placeholder="Search by name, phone, or GST"
          placeholderTextColor="#9ca3af"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Text style={s.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={s.listHeaderRow}>
        <Text style={s.sectionTitle}>My Parties</Text>
        <Text style={s.count}>{filtered.length} of {parties.length}</Text>
      </View>

      {/* Content */}
      {loading ? (
        <View style={s.centerWrap}>
          <ActivityIndicator size="large" color="#d97706" />
        </View>
      ) : error ? (
        <View style={s.centerWrap}>
          <Text style={s.errorTxt}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => fetchParties()}>
            <Text style={s.retryTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchParties(true)} colors={['#d97706']} />
          }
          ListEmptyComponent={
            <View style={s.centerWrap}>
              <Text style={s.emptyIcon}>🏪</Text>
              <Text style={s.emptyTxt}>
                {query ? 'No parties match your search.' : 'No parties linked to you yet.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <PartyCard
              party={item}
              onPress={() => navigation.navigate('PartyOrders', {
                partyId: item.id,
                partyName: item.partyName,
              })}
            />
          )}
        />
      )}
    </View>
  );
}

function PartyCard({ party, onPress }: { party: PartyDto; onPress: () => void }) {
  const isCr = party.openingBalanceType === 'CR';
  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.7}>
      <View style={s.cardTop}>
        <View style={s.avatar}>
          <Text style={s.avatarTxt}>{(party.partyName || '?').charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.partyName} numberOfLines={1}>{party.partyName || 'Unnamed Party'}</Text>
          {party.customerType ? <Text style={s.partyType}>{party.customerType}</Text> : null}
        </View>
        {party.openingBalance != null && (
          <View style={[s.balanceBadge, { backgroundColor: isCr ? '#f0fdf4' : '#fef2f2' }]}>
            <Text style={[s.balanceTxt, { color: isCr ? '#16a34a' : '#dc2626' }]}>
              ₹{Number(party.openingBalance).toLocaleString('en-IN')} {party.openingBalanceType || ''}
            </Text>
          </View>
        )}
      </View>

      <View style={s.divider} />

      <InfoRow icon="📞" value={party.mobileNo ? `+91 ${party.mobileNo}` : '—'} />
      <InfoRow icon="🧾" value={party.gstNo || '—'} />
      <InfoRow
        icon="📍"
        value={[party.address, party.stateName].filter(Boolean).join(', ') || '—'}
        multiline
      />
    </TouchableOpacity>
  );
}

function InfoRow({ icon, value, multiline }: { icon: string; value: string; multiline?: boolean }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoIcon}>{icon}</Text>
      <Text style={s.infoValue} numberOfLines={multiline ? 2 : 1}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f9fafb' },

  header: {
    paddingTop: 56, paddingBottom: 24, paddingHorizontal: 20,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  greeting:    { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  brokerName:  { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 2 },
  brokerPhone: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 4 },

  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  logoutTxt: { color: '#fff', fontWeight: '700', fontSize: 12 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', marginHorizontal: 20, marginTop: 16, marginBottom: 4,
    borderRadius: 12, paddingHorizontal: 14, borderWidth: 1.5, borderColor: '#e5e7eb',
  },
  searchIcon:  { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#111827' },
  clearBtn:    { color: '#9ca3af', fontSize: 16, paddingHorizontal: 4 },

  listHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginTop: 16, marginBottom: 4,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1f2937' },
  count:        { fontSize: 12, color: '#9ca3af', fontWeight: '600' },

  list: { padding: 20, paddingTop: 8, paddingBottom: 40, flexGrow: 1 },

  centerWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  errorTxt:   { color: '#dc2626', fontSize: 13, textAlign: 'center', marginBottom: 12 },
  retryBtn:   { backgroundColor: '#d97706', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryTxt:   { color: '#fff', fontWeight: '700', fontSize: 13 },
  emptyIcon:  { fontSize: 36, marginBottom: 8 },
  emptyTxt:   { color: '#9ca3af', fontSize: 13, textAlign: 'center' },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: '#f3f4f6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: '#fef3c7',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  avatarTxt:  { fontSize: 17, fontWeight: '800', color: '#d97706' },
  partyName:  { fontSize: 15, fontWeight: '800', color: '#1f2937' },
  partyType:  { fontSize: 11, color: '#9ca3af', fontWeight: '600', marginTop: 2 },

  balanceBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  balanceTxt:   { fontSize: 11, fontWeight: '800' },

  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 12 },

  infoRow:   { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  infoIcon:  { fontSize: 13, marginRight: 8, width: 18 },
  infoValue: { flex: 1, fontSize: 13, color: '#374151', fontWeight: '500' },
});