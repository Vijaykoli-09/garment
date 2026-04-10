package com.garment.serviceImpl;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.garment.DTO.OrderSettleDTO;
import com.garment.DTO.OrderSettleRowDTO;
import com.garment.DTO.OrderSettleSizeDetailDTO;
import com.garment.DTO.PendencyFulfillRequestDTO;
import com.garment.DTO.SaleOrderDTO;
import com.garment.DTO.SaleOrderPendencyRowDTO;
import com.garment.DTO.SaleOrderRowDTO;
import com.garment.DTO.SaleOrderSaveDTO;
import com.garment.DTO.SaleOrderSizeDetailDTO;
import com.garment.model.SaleOrder;
import com.garment.model.SaleOrderRow;
import com.garment.model.SaleOrderSizeDetail;
import com.garment.model.Size;
import com.garment.repository.PartyRepository;
import com.garment.repository.SaleOrderRepository;
import com.garment.repository.ShadeRepository;
import com.garment.repository.SizeRepository;
import com.garment.service.OrderSettleService;
import com.garment.service.SaleOrderService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class SaleOrderServiceImpl implements SaleOrderService {

    private final SaleOrderRepository repo;
    private final ShadeRepository shadeRepo;
    private final SizeRepository sizeRepo;
    private final PartyRepository partyRepo;
    private final OrderSettleService orderSettleService; // USE EXISTING SERVICE

    /* ---------- Helpers ---------- */

    private static int toInt(String s){
        try { return (int) Math.floor(Double.parseDouble(Objects.toString(s, "0"))); }
        catch (Exception e){ return 0; }
    }
    private static BigDecimal toBd(String s){
        try { return new BigDecimal(Objects.toString(s, "0")); }
        catch (Exception e){ return BigDecimal.ZERO; }
    }
    private static LocalDate parseDate(String s){
        try { return (s == null || s.isBlank()) ? null : LocalDate.parse(s); }
        catch (Exception e){ return null; }
    }
    private Map<String,String> safeMap(Map<String,String> m){ return m != null ? m : Collections.emptyMap(); }

    private String buildNextOrderNoInternal() {
        int year = LocalDate.now().getYear();
        String prefix = "O/" + year + "-";
        List<String> nos = repo.findOrderNosByPrefix(prefix);
        int maxSerial = 0;
        for (String no : nos) {
            try {
                String ser = no.substring(prefix.length());
                int n = Integer.parseInt(ser);
                if (n > maxSerial) maxSerial = n;
            } catch (Exception ignored) {}
        }
        int next = maxSerial + 1;
        return String.format("O/%d-%04d", year, next);
    }

    private SaleOrderDTO toDto(SaleOrder so){
        List<SaleOrderRowDTO> rowDtos = so.getRows().stream().map(r -> {
            List<SaleOrderSizeDetailDTO> sds = r.getSizeDetails().stream().map(sd -> {
                Long sid = sd.getSize() != null ? sd.getSize().getId() : null;
                return new SaleOrderSizeDetailDTO(sid, sd.getSizeName(), sd.getQty(), sd.getRate());
            }).collect(Collectors.toList());
            String shadeCode = r.getShade() != null ? r.getShade().getShadeCode() : null;
            return new SaleOrderRowDTO(
                    r.getSno(), r.getArtSerial(), r.getArtNo(), r.getDescription(),
                    shadeCode, r.getShadeName(), r.getPeti(), r.getRemarks(), sds
            );
        }).collect(Collectors.toList());

        return new SaleOrderDTO(
                so.getId(), so.getOrderNo(), so.getDated(), so.getDeliveryDate(),
                so.getPartyId(), so.getPartyName(), so.getRemarks(),
                so.getTotalPeti(), so.getTotalPcs(), rowDtos
        );
    }

    private void applyTotals(SaleOrder so){
        int totalPeti = 0;
        int totalPcs = 0;
        for (SaleOrderRow r : so.getRows()) {
            int peti = Optional.ofNullable(r.getPeti()).orElse(1);
            if (r.getArtNo() != null && !r.getArtNo().isBlank()) totalPeti += peti;
            int rowQty = r.getSizeDetails().stream()
                    .map(sd -> Optional.ofNullable(sd.getQty()).orElse(0))
                    .reduce(0, Integer::sum);
            totalPcs += rowQty * peti;
        }
        so.setTotalPeti(totalPeti);
        so.setTotalPcs(totalPcs);
    }

    private void fillRowFromMaps(SaleOrderRow row, Map<String,String> qtyMap, Map<String,String> rateMap){
        Set<String> keys = new LinkedHashSet<>();
        keys.addAll(qtyMap.keySet());
        keys.addAll(rateMap.keySet());

        for (String name : keys) {
            if (name == null || name.isBlank()) continue;
            int qty = toInt(qtyMap.get(name));
            BigDecimal rate = toBd(rateMap.get(name));
            SaleOrderSizeDetail sd = new SaleOrderSizeDetail();
            sd.setRow(row);
            sd.setSizeName(name);
            Size size = sizeRepo.findBySizeNameIgnoreCase(name).orElse(null);
            sd.setSize(size);
            sd.setQty(qty);
            sd.setRate(rate);
            row.addSize(sd);
        }
    }

    private void setShade(SaleOrderRow row, String shadeName){
        if (shadeName == null || shadeName.isBlank()) {
            row.setShade(null);
            row.setShadeName(null);
            return;
        }
        row.setShadeName(shadeName.trim());
        shadeRepo.findByShadeNameIgnoreCase(row.getShadeName())
                .ifPresentOrElse(row::setShade, () -> row.setShade(null));
    }

    private SaleOrder buildEntityFromSave(SaleOrderSaveDTO dto){
        SaleOrder so = new SaleOrder();
        String orderNo = (dto.getOrderNo() == null || dto.getOrderNo().isBlank())
                ? buildNextOrderNoInternal()
                : dto.getOrderNo().trim();
        so.setOrderNo(orderNo);

        so.setDated(parseDate(dto.getDated()));
        so.setDeliveryDate(parseDate(dto.getDeliveryDate()));
        so.setPartyId(dto.getPartyId());
        so.setPartyName(dto.getPartyName());
        so.setRemarks(dto.getRemarks());

        List<SaleOrderSaveDTO.SaleOrderSaveRowDTO> rows = dto.getRows() != null ? dto.getRows() : List.of();
        int i = 1;
        for (SaleOrderSaveDTO.SaleOrderSaveRowDTO rr : rows) {
            if ((rr.getArtNo() == null || rr.getArtNo().isBlank())) continue;

            SaleOrderRow r = new SaleOrderRow();
            r.setSno(i++);
            r.setArtSerial(rr.getArtSerial());
            r.setArtNo(rr.getArtNo());
            r.setDescription(rr.getDescription());
            r.setPeti(toInt(rr.getPeti()));
            r.setRemarks(rr.getRemarks());
            setShade(r, rr.getShade());

            Map<String,String> qtyMap = !safeMap(rr.getSizesQty()).isEmpty()
                    ? rr.getSizesQty() : safeMap(rr.getSizes()); // legacy fallback
            Map<String,String> rateMap = safeMap(rr.getSizesRate());
            fillRowFromMaps(r, qtyMap, rateMap);

            so.addRow(r);
        }

        applyTotals(so);
        return so;
    }

    /* ---------- CRUD ---------- */

    @Override
    public String nextOrderNo(){
        return buildNextOrderNoInternal();
    }

    @Override
    public SaleOrderDTO create(SaleOrderSaveDTO dto) {
        SaleOrder so = buildEntityFromSave(dto);
        SaleOrder saved = repo.save(so);
        return toDto(saved);
    }

    @Override
    public SaleOrderDTO update(Long id, SaleOrderSaveDTO dto) {
        SaleOrder existing = repo.findById(id).orElseThrow(() -> new RuntimeException("Sale Order not found"));
        SaleOrder fresh = buildEntityFromSave(dto);

        existing.setOrderNo((dto.getOrderNo() == null || dto.getOrderNo().isBlank())
                ? existing.getOrderNo()
                : dto.getOrderNo().trim());
        existing.setDated(fresh.getDated());
        existing.setDeliveryDate(fresh.getDeliveryDate());
        existing.setPartyId(fresh.getPartyId());
        existing.setPartyName(fresh.getPartyName());
        existing.setRemarks(fresh.getRemarks());

        existing.getRows().clear();
        for (SaleOrderRow nr : fresh.getRows()) {
            nr.setId(null);
            existing.addRow(nr);
        }
        applyTotals(existing);
        SaleOrder saved = repo.save(existing);
        return toDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public SaleOrderDTO get(Long id) {
        return repo.findById(id).map(this::toDto).orElseThrow(() -> new RuntimeException("Not found"));
    }

    @Override
    @Transactional(readOnly = true)
    public List<SaleOrderDTO> list() {
        return repo.findAll().stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    public void delete(Long id) {
        repo.deleteById(id);
    }

    /* ---------- PENDENCY (Art + Size + Shade Wise) ---------- */

    @Override
    @Transactional(readOnly = true)
    public List<SaleOrderPendencyRowDTO> pendency(
            LocalDate from,
            LocalDate to,
            List<String> destinationsUpper,
            List<Long> partyIds,
            List<String> artNosLower,
            List<String> sizeNamesUpper,
            List<String> shadeNamesUpper
    ) {
        // 1) Load Sale Orders in date range
        List<SaleOrder> soRecv = repo.findByDatedBetween(from, to);

        // 2) Map party -> station (UPPER)
        Set<Long> partyIdSet = new HashSet<>();
        for (SaleOrder so : soRecv) {
            if (so.getPartyId() != null) {
                partyIdSet.add(so.getPartyId());
            }
        }

        Map<Long, String> partyStation = new HashMap<>();
        if (!partyIdSet.isEmpty()) {
            partyRepo.findAllById(partyIdSet).forEach(p -> {
                String st = Optional.ofNullable(p.getStation()).orElse("");
                partyStation.put(p.getId(), st.toUpperCase().trim());
            });
        }

        final Set<String> destFilter   = new HashSet<>(destinationsUpper == null ? List.of() : destinationsUpper);
        final Set<Long>   partyFilter  = new HashSet<>(partyIds == null ? List.of() : partyIds);
        final Set<String> artFilter    = new HashSet<>(artNosLower == null ? List.of() : artNosLower);
        final Set<String> sizeFilter   = new HashSet<>(sizeNamesUpper == null ? List.of() : sizeNamesUpper);
        final Set<String> shadeFilter  = new HashSet<>(shadeNamesUpper == null ? List.of() : shadeNamesUpper);

        java.util.function.Function<String,String> up  = s -> s == null ? "" : s.trim().toUpperCase();
        java.util.function.Function<String,String> low = s -> s == null ? "" : s.trim().toLowerCase();

        // Aggregation holder
        class Agg {
            int opening = 0;
            int receipt = 0;
            int dispatch = 0;
            int pending = 0;

            String dest;
            Long   pid;
            String pname;
            String artNo;
            String artName;
            String shade;
            String size;
        }

        Map<String, Agg> map = new LinkedHashMap<>();

        java.util.function.BiConsumer<String, java.util.function.Consumer<Agg>> put =
                (key, consumer) -> {
                    Agg a = map.get(key);
                    if (a == null) {
                        a = new Agg();
                        map.put(key, a);
                    }
                    consumer.accept(a);
                };

        // 3) Aggregate from Sale Order size details
        for (SaleOrder so : soRecv) {
            Long pid = so.getPartyId();
            String station = pid != null ? up.apply(partyStation.get(pid)) : "";

            // Destination filter
            if (!destFilter.isEmpty()) {
                if (station.isEmpty() || !destFilter.contains(station)) continue;
            }

            // Party filter
            if (!partyFilter.isEmpty()) {
                if (pid == null || !partyFilter.contains(pid)) continue;
            }

            String partyName = Optional.ofNullable(so.getPartyName()).orElse("");

            for (SaleOrderRow row : Optional.ofNullable(so.getRows()).orElse(List.of())) {
                String artNo = Optional.ofNullable(row.getArtNo()).orElse("");
                String artNoLower = low.apply(artNo);
                if (!artFilter.isEmpty() && !artFilter.contains(artNoLower)) continue;

                String artName = Optional.ofNullable(row.getDescription()).orElse(artNo);

                // Shade
                String shadeName = null;
                if (row.getShadeName() != null && !row.getShadeName().isBlank()) {
                    shadeName = row.getShadeName().trim();
                } else if (row.getShade() != null) {
                    shadeName = Optional.ofNullable(row.getShade().getShadeName())
                            .orElse(row.getShade().getShadeCode());
                }
                String shadeUpper = up.apply(shadeName);
                if (!shadeFilter.isEmpty()) {
                    if (shadeUpper.isEmpty() || !shadeFilter.contains(shadeUpper)) continue;
                }

                // IMPORTANT:
                // PETI KO IGNORE KARNA HAI
                // Pehle effectivePeti * box hota tha, ab sirf box = qty

                for (SaleOrderSizeDetail sd : Optional.ofNullable(row.getSizeDetails()).orElse(List.of())) {
                    String rawSize = Optional.ofNullable(sd.getSizeName()).orElse("");
                    String[] parts = rawSize.split("__", 2);
                    String baseSize = up.apply(parts[0]);   // e.g. "M", "L"

                    if (!sizeFilter.isEmpty() && !sizeFilter.contains(baseSize)) continue;

                    int box = Optional.ofNullable(sd.getQty()).orElse(0);
                    if (box == 0) continue; // qty 0 skip

                    String key = station + "|" + String.valueOf(pid) + "|" + artNoLower + "|" + shadeUpper + "|" + baseSize;
                    put.accept(key, a -> {
                        a.dest    = station;
                        a.pid     = pid;
                        a.pname   = partyName;
                        a.artNo   = artNo;
                        a.artName = artName;
                        a.shade   = shadeUpper;
                        a.size    = baseSize;

                        // AB PETI se multiply NAHI (direct qty use)
                        a.receipt += box;
                        // opening, dispatch abhi 0 hai
                        a.pending = a.opening + a.receipt - a.dispatch;
                    });
                }
            }
        }

        // 4) Final DTO list:
        //    - pending = opening + receipt - dispatch
        //    - sirf woh rows jinke pending != 0  (0 wali row skip)
        return map.values().stream()
                .peek(a -> a.pending = a.opening + a.receipt - a.dispatch)
                .filter(a -> a.pending != 0)   // ✅ only non-zero pending (negative allowed)
                .map(a -> new SaleOrderPendencyRowDTO(
                        a.dest,
                        a.pid,
                        a.pname,
                        a.artNo,
                        a.artName,
                        a.shade,
                        a.size,
                        a.opening,
                        a.receipt,
                        a.dispatch,
                        a.pending
                ))
                .sorted(
                        Comparator
                                .comparing(SaleOrderPendencyRowDTO::getDestination, Comparator.nullsLast(String::compareTo))
                                .thenComparing(SaleOrderPendencyRowDTO::getPartyName, Comparator.nullsLast(String::compareTo))
                                .thenComparing(SaleOrderPendencyRowDTO::getArtNo, Comparator.nullsLast(String::compareTo))
                                .thenComparing(SaleOrderPendencyRowDTO::getShade, Comparator.nullsLast(String::compareTo))
                                .thenComparing(SaleOrderPendencyRowDTO::getSize, Comparator.nullsLast(String::compareTo))
                )
                .collect(Collectors.toList());
    }

    /* ---------- Fulfill Pendency ---------- */

    @Override
    @Transactional
    public void fulfillPendency(PendencyFulfillRequestDTO req) {
        if (req == null || req.getRows() == null || req.getRows().isEmpty()) return;

        Map<Long, List<SaleOrderPendencyRowDTO>> byParty =
                req.getRows().stream()
                        .filter(r -> r.getPending() != null && r.getPending() != 0)
                        .filter(r -> r.getPartyId() != null)
                        .collect(Collectors.groupingBy(SaleOrderPendencyRowDTO::getPartyId));

        for (Map.Entry<Long, List<SaleOrderPendencyRowDTO>> e : byParty.entrySet()) {
            Long partyId = e.getKey();
            List<SaleOrderPendencyRowDTO> rows = e.getValue();
            if (partyId == null || rows.isEmpty()) continue;

            OrderSettleDTO osDto = new OrderSettleDTO();
            osDto.setPartyId(partyId);
            osDto.setPartyName(rows.get(0).getPartyName());
            osDto.setDated(LocalDate.now());
            osDto.setRemarks1("Auto fulfill from Sale Order Pendency");

            List<OrderSettleRowDTO> rowDtos = new ArrayList<>();

            Map<String, List<SaleOrderPendencyRowDTO>> byArtShade =
                    rows.stream().collect(Collectors.groupingBy(r ->
                            (r.getArtNo() == null ? "" : r.getArtNo().trim().toUpperCase()) +
                                    "|" + (r.getShade() == null ? "" : r.getShade().trim().toUpperCase())
                    ));

            for (Map.Entry<String, List<SaleOrderPendencyRowDTO>> es : byArtShade.entrySet()) {
                List<SaleOrderPendencyRowDTO> artShadeRows = es.getValue();
                if (artShadeRows.isEmpty()) continue;

                OrderSettleRowDTO rd = new OrderSettleRowDTO();
                rd.setArtNo(artShadeRows.get(0).getArtNo());
                rd.setShade(artShadeRows.get(0).getShade());
                rd.setDescription(artShadeRows.get(0).getArtName());

                List<OrderSettleSizeDetailDTO> sdDtos = new ArrayList<>();

                for (SaleOrderPendencyRowDTO r : artShadeRows) {
                    int pending = Optional.ofNullable(r.getPending()).orElse(0);
                    if (pending == 0) continue;

                    OrderSettleSizeDetailDTO sd = new OrderSettleSizeDetailDTO();
                    sd.setSizeName(r.getSize());
                    sd.setSettleBox(pending);
                    sdDtos.add(sd);
                }

                if (!sdDtos.isEmpty()) {
                    rd.setSizeDetails(sdDtos);
                    rowDtos.add(rd);
                }
            }

            if (rowDtos.isEmpty()) continue;

            osDto.setRows(rowDtos);
            orderSettleService.create(osDto);
        }
    }
}