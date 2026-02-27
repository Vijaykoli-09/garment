package com.garment.serviceImpl;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    /* ---------- PENDENCY (Receipt only: Peti × Box; Opening=0; Dispatch=0) ---------- */

    @Override
    @Transactional(readOnly = true)
    public List<SaleOrderPendencyRowDTO> pendency(
            LocalDate from,
            LocalDate to,
            List<String> destinationsUpper,
            List<Long> partyIds,
            List<String> artNosLower,
            List<String> sizeNamesUpper
    ) {
        // Only SO in [from,to] for receipt; opening=0, dispatch=0
        List<SaleOrder> soRecv = repo.findByDatedBetween(from, to);

        // Resolve station (destination) for involved parties
        Set<Long> partyIdSet = new HashSet<>();
        soRecv.forEach(so -> { if (so.getPartyId()!=null) partyIdSet.add(so.getPartyId()); });

        Map<Long, String> partyStation = new HashMap<>();
        if (!partyIdSet.isEmpty()) {
            partyRepo.findAllById(partyIdSet).forEach(p -> {
                partyStation.put(p.getId(), Optional.ofNullable(p.getStation()).orElse(""));
            });
        }

        // Filters
        final Set<String> destFilter = new HashSet<>(destinationsUpper == null ? List.of() : destinationsUpper);
        final Set<Long> partyFilter = new HashSet<>(partyIds == null ? List.of() : partyIds);
        final Set<String> artFilter = new HashSet<>(artNosLower == null ? List.of() : artNosLower);
        final Set<String> sizeFilter = new HashSet<>(sizeNamesUpper == null ? List.of() : sizeNamesUpper);

        class Agg { int receipt=0; String dest; Long pid; String pname; String artNo; String artName; String size; }
        Map<String, Agg> map = new LinkedHashMap<>();

        java.util.function.Function<String,String> up = s -> s==null? "": s.trim().toUpperCase();
        java.util.function.Function<String,String> low = s -> s==null? "": s.trim().toLowerCase();

        java.util.function.BiConsumer<String, java.util.function.Consumer<Agg>> put = (key, consumer) -> {
            Agg a = map.get(key);
            if (a == null) { a = new Agg(); map.put(key, a); }
            consumer.accept(a);
        };

        // Accumulate receipt: per-size 'box' × peti
        for (SaleOrder so : soRecv) {
            Long pid = so.getPartyId();
            String station = pid != null ? up.apply(partyStation.get(pid)) : "";
            if (!destFilter.isEmpty() && (station.isEmpty() || !destFilter.contains(station))) continue;
            if (!partyFilter.isEmpty() && (pid == null || !partyFilter.contains(pid))) continue;
            String partyName = Optional.ofNullable(so.getPartyName()).orElse("");

            for (SaleOrderRow row : Optional.ofNullable(so.getRows()).orElse(List.of())) {
                String artNo = Optional.ofNullable(row.getArtNo()).orElse("");
                if (!artFilter.isEmpty() && !artFilter.contains(low.apply(artNo))) continue;
                String artName = Optional.ofNullable(row.getDescription()).orElse(artNo);
                int peti = Optional.ofNullable(row.getPeti()).orElse(1); // PETI

                for (SaleOrderSizeDetail sd : Optional.ofNullable(row.getSizeDetails()).orElse(List.of())) {
                    String sizeName = up.apply(Optional.ofNullable(sd.getSizeName()).orElse(""));
                    if (!sizeFilter.isEmpty() && !sizeFilter.contains(sizeName)) continue;

                    int box = Optional.ofNullable(sd.getQty()).orElse(0); // treat per-size qty as BOX
                    int rec = peti * box;                                // Receipt = Peti × Box

                    String key = station + "|" + String.valueOf(pid) + "|" + artNo + "|" + sizeName;
                    put.accept(key, a -> {
                        a.dest = station; a.pid = pid; a.pname = partyName;
                        a.artNo = artNo; a.artName = artName; a.size = sizeName;
                        a.receipt += rec;
                    });
                }
            }
        }

        // Build DTOs: opening=0, dispatch=0, pending=receipt
        return map.values().stream().map(a ->
                new SaleOrderPendencyRowDTO(
                        a.dest, a.pid, a.pname, a.artNo, a.artName, a.size,
                        0, a.receipt, 0, a.receipt
                )
        ).sorted(Comparator
                .comparing(SaleOrderPendencyRowDTO::getDestination, Comparator.nullsLast(String::compareTo))
                .thenComparing(SaleOrderPendencyRowDTO::getPartyName, Comparator.nullsLast(String::compareTo))
                .thenComparing(SaleOrderPendencyRowDTO::getArtNo, Comparator.nullsLast(String::compareTo))
                .thenComparing(SaleOrderPendencyRowDTO::getSize, Comparator.nullsLast(String::compareTo))
        ).collect(Collectors.toList());
    }
}